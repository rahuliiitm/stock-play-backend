import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRedis } from '../../../lib/redis';
import { GrowwApiService } from '../../broker/services/groww-api.service';
import {
  TimeframeType,
  REDIS_KEYS,
  getCandleEntity,
  CandleEntity,
} from '../schemas/candle.schema';

export interface LiveCandleData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  exchange?: string;
  segment?: string;
}

export interface SubscriptionConfig {
  symbols: string[];
  timeframes: TimeframeType[];
  updateIntervalMs?: number; // Default 60 seconds for polling
}

@Injectable()
export class LiveDataFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveDataFeedService.name);
  private subscriptions: Map<string, SubscriptionConfig> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_UPDATE_INTERVAL = 60000; // 1 minute
  private isRunning = false;

  constructor(
    private eventEmitter: EventEmitter2,
    private growwApiService: GrowwApiService,
  ) {}

  async onModuleInit() {
    this.logger.log('Live Data Feed Service initialized');
    this.isRunning = true;
  }

  async onModuleDestroy() {
    this.logger.log('Live Data Feed Service shutting down');
    this.isRunning = false;
    this.stopAllSubscriptions();
  }

  /**
   * Subscribe to live data for multiple symbols
   */
  async subscribe(config: SubscriptionConfig): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscriptions.set(subscriptionId, {
      ...config,
      updateIntervalMs: config.updateIntervalMs || this.DEFAULT_UPDATE_INTERVAL,
    });

    this.logger.log(
      `Created subscription ${subscriptionId} for ${config.symbols.length} symbols`,
    );

    // Start the data feed
    await this.startSubscription(subscriptionId);

    return subscriptionId;
  }

  /**
   * Unsubscribe from live data
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const config = this.subscriptions.get(subscriptionId);
    if (!config) {
      this.logger.warn(`Subscription ${subscriptionId} not found`);
      return;
    }

    this.stopSubscription(subscriptionId);
    this.subscriptions.delete(subscriptionId);
    this.logger.log(`Unsubscribed ${subscriptionId}`);
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(subscriptionId: string): SubscriptionConfig | null {
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): Record<string, SubscriptionConfig> {
    const result: Record<string, SubscriptionConfig> = {};
    for (const [id, config] of this.subscriptions) {
      result[id] = config;
    }
    return result;
  }

  private async startSubscription(subscriptionId: string): Promise<void> {
    const config = this.subscriptions.get(subscriptionId);
    if (!config) return;

    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.fetchAndProcessData(subscriptionId, config);
      } catch (error) {
        this.logger.error(`Error in subscription ${subscriptionId}:`, error);
      }
    }, config.updateIntervalMs);

    this.updateIntervals.set(subscriptionId, interval);
    this.logger.log(
      `Started subscription ${subscriptionId} with ${config.updateIntervalMs}ms interval`,
    );
  }

  private stopSubscription(subscriptionId: string): void {
    const interval = this.updateIntervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(subscriptionId);
    }
  }

  private stopAllSubscriptions(): void {
    for (const [subscriptionId] of this.subscriptions) {
      this.stopSubscription(subscriptionId);
    }
  }

  private async fetchAndProcessData(
    subscriptionId: string,
    config: SubscriptionConfig,
  ): Promise<void> {
    const redis = getRedis();
    if (!redis) {
      this.logger.warn('Redis not available for live data processing');
      return;
    }

    for (const symbol of config.symbols) {
      try {
        // Fetch live quote from Groww API
        const quote = await this.growwApiService.getQuote(symbol);

        const candleData: LiveCandleData = {
          symbol,
          timestamp: Date.now(),
          price: Number(quote?.ltp || quote?.price || 0),
          volume: quote?.volume || 0,
          exchange: 'NSE',
          segment: 'CASH',
        };

        // Store raw data in Redis for aggregation
        await redis.setex(
          `${REDIS_KEYS.LIVE_DATA_FEED}:${symbol}`,
          300, // 5 minutes TTL
          JSON.stringify(candleData),
        );

        // Emit event for real-time processing
        this.eventEmitter.emit('trading.liveData', {
          subscriptionId,
          data: candleData,
          timeframes: config.timeframes,
        });

        this.logger.debug(
          `Processed live data for ${symbol}: ₹${candleData.price}`,
        );
      } catch (error) {
        this.logger.error(`Failed to fetch data for ${symbol}:`, error);
      }
    }
  }

  /**
   * Manual trigger for data fetch (useful for testing)
   */
  async triggerDataFetch(subscriptionId: string): Promise<void> {
    const config = this.subscriptions.get(subscriptionId);
    if (!config) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    await this.fetchAndProcessData(subscriptionId, config);
  }

  /**
   * Get latest live data for a symbol from Redis
   */
  async getLatestLiveData(symbol: string): Promise<LiveCandleData | null> {
    const redis = getRedis();
    if (!redis) return null;

    const data = await redis.get(`${REDIS_KEYS.LIVE_DATA_FEED}:${symbol}`);
    return data ? JSON.parse(data) : null;
  }
}
