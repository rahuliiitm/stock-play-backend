import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRedis } from '../../../lib/redis';
import {
  TimeframeType,
  REDIS_KEYS,
  getCandleEntity,
  CandleEntity,
  Candle1m
} from '../schemas/candle.schema';
import { LiveCandleData } from './live-data-feed.service';

interface AggregatedCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  count: number; // Number of 1m candles aggregated
  startTime: number; // Start timestamp of aggregation period
}

@Injectable()
export class CandleAggregationService {
  private readonly logger = new Logger(CandleAggregationService.name);

  constructor(
    @InjectRepository(Candle1m)
    private candle1mRepository: Repository<Candle1m>,
  ) {}

  /**
   * Process live candle data and aggregate it across all configured timeframes
   */
  async processLiveCandle(liveData: LiveCandleData, timeframes: TimeframeType[]): Promise<void> {
    const redis = getRedis();
    if (!redis) {
      this.logger.warn('Redis not available for candle aggregation');
      return;
    }

    // Always save 1-minute candle to database
    await this.save1MinuteCandle(liveData);

    // Aggregate for higher timeframes
    for (const timeframe of timeframes) {
      if (timeframe === '1m') continue; // Already saved above

      try {
        await this.aggregateTimeframe(liveData, timeframe);
      } catch (error) {
        this.logger.error(`Failed to aggregate ${timeframe} for ${liveData.symbol}:`, error);
      }
    }
  }

  /**
   * Save 1-minute candle directly to database
   */
  private async save1MinuteCandle(liveData: LiveCandleData): Promise<void> {
    const candle1m = this.candle1mRepository.create({
      symbol: liveData.symbol,
      timestamp: Math.floor(liveData.timestamp / 60000) * 60000, // Round to nearest minute
      open: liveData.price,
      high: liveData.price,
      low: liveData.price,
      close: liveData.price,
      volume: liveData.volume,
    });

    await this.candle1mRepository.save(candle1m);
    this.logger.debug(`Saved 1m candle for ${liveData.symbol} at ${new Date(liveData.timestamp).toISOString()}`);
  }

  /**
   * Aggregate data for a specific timeframe
   */
  private async aggregateTimeframe(liveData: LiveCandleData, timeframe: TimeframeType): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const symbol = liveData.symbol;
    const aggregationKey = REDIS_KEYS.CANDLE_AGGREGATION(symbol, timeframe);
    const lastCandleKey = REDIS_KEYS.LAST_CANDLE(symbol, timeframe);

    // Get timeframe duration in milliseconds
    const timeframeMs = this.getTimeframeDuration(timeframe);

    // Round timestamp to timeframe boundary
    const timeframeStart = Math.floor(liveData.timestamp / timeframeMs) * timeframeMs;

    // Get existing aggregation data
    const existingData = await redis.get(aggregationKey);
    let aggregatedCandle: AggregatedCandle;

    if (existingData) {
      aggregatedCandle = JSON.parse(existingData);

      // Check if we need to start a new aggregation period
      if (aggregatedCandle.startTime !== timeframeStart) {
        // Save completed candle to database
        await this.saveAggregatedCandle(aggregatedCandle, symbol, timeframe);

        // Start new aggregation period
        aggregatedCandle = {
          open: liveData.price,
          high: liveData.price,
          low: liveData.price,
          close: liveData.price,
          volume: liveData.volume,
          count: 1,
          startTime: timeframeStart,
        };
      } else {
        // Update existing aggregation
        aggregatedCandle.high = Math.max(aggregatedCandle.high, liveData.price);
        aggregatedCandle.low = Math.min(aggregatedCandle.low, liveData.price);
        aggregatedCandle.close = liveData.price;
        aggregatedCandle.volume += liveData.volume;
        aggregatedCandle.count += 1;
      }
    } else {
      // First data point for this timeframe
      aggregatedCandle = {
        open: liveData.price,
        high: liveData.price,
        low: liveData.price,
        close: liveData.price,
        volume: liveData.volume,
        count: 1,
        startTime: timeframeStart,
      };
    }

    // Save updated aggregation back to Redis
    await redis.setex(aggregationKey, timeframeMs / 1000 * 2, JSON.stringify(aggregatedCandle));

    this.logger.debug(`Updated ${timeframe} aggregation for ${symbol}: ${aggregatedCandle.count} candles`);
  }

  /**
   * Save completed aggregated candle to database
   */
  private async saveAggregatedCandle(
    aggregatedCandle: AggregatedCandle,
    symbol: string,
    timeframe: TimeframeType
  ): Promise<void> {
    const EntityClass = getCandleEntity(timeframe);
    const repository = this.getRepositoryForEntity(EntityClass);

    const candle = repository.create({
      symbol,
      timestamp: aggregatedCandle.startTime,
      open: aggregatedCandle.open,
      high: aggregatedCandle.high,
      low: aggregatedCandle.low,
      close: aggregatedCandle.close,
      volume: aggregatedCandle.volume,
    });

    await repository.save(candle);
    this.logger.debug(`Saved ${timeframe} candle for ${symbol} at ${new Date(aggregatedCandle.startTime).toISOString()}`);
  }

  /**
   * Get timeframe duration in milliseconds
   */
  private getTimeframeDuration(timeframe: TimeframeType): number {
    const durations = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return durations[timeframe];
  }

  /**
   * Get repository for a specific entity
   */
  private getRepositoryForEntity(EntityClass: new () => CandleEntity): Repository<CandleEntity> {
    // This is a simplified approach - in a real implementation,
    // you'd inject all repositories or use a more sophisticated approach
    const entityName = EntityClass.name;
    switch (entityName) {
      case 'Candle1m':
        return this.candle1mRepository as any;
      default:
        throw new Error(`Repository not found for entity ${entityName}`);
    }
  }

  /**
   * Get aggregated candle data from Redis (for debugging/testing)
   */
  async getAggregatedCandle(symbol: string, timeframe: TimeframeType): Promise<AggregatedCandle | null> {
    const redis = getRedis();
    if (!redis) return null;

    const data = await redis.get(REDIS_KEYS.CANDLE_AGGREGATION(symbol, timeframe));
    return data ? JSON.parse(data) : null;
  }

  /**
   * Force save all current aggregations to database (useful for shutdown)
   */
  async flushAllAggregations(): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    this.logger.log('Flushing all candle aggregations to database...');

    // Get all aggregation keys
    const keys = await redis.keys('trading:candle:*:*');
    let flushed = 0;

    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (data) {
          const aggregatedCandle: AggregatedCandle = JSON.parse(data);
          const [, , symbol, timeframe] = key.split(':');

          await this.saveAggregatedCandle(aggregatedCandle, symbol, timeframe as TimeframeType);
          flushed++;
        }
      } catch (error) {
        this.logger.error(`Failed to flush aggregation for key ${key}:`, error);
      }
    }

    this.logger.log(`Flushed ${flushed} candle aggregations to database`);
  }

  /**
   * Clean up old aggregation data (useful for maintenance)
   */
  async cleanupOldAggregations(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const cutoffTime = Date.now() - olderThanMs;
    const keys = await redis.keys('trading:candle:*:*');
    let cleaned = 0;

    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (data) {
          const aggregatedCandle: AggregatedCandle = JSON.parse(data);
          if (aggregatedCandle.startTime < cutoffTime) {
            await redis.del(key);
            cleaned++;
          }
        }
      } catch (error) {
        this.logger.error(`Failed to check aggregation for cleanup: ${key}`, error);
      }
    }

    this.logger.log(`Cleaned up ${cleaned} old candle aggregations`);
  }
}
