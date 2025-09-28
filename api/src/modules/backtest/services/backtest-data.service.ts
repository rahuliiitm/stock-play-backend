import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { MarketDataProvider } from '../../trading/interfaces/data-provider.interface';

/**
 * Backtest Data Service
 *
 * This service handles data preparation and validation for backtesting.
 * It ensures data quality and provides data preprocessing capabilities.
 */
@Injectable()
export class BacktestDataService {
  private readonly logger = new Logger(BacktestDataService.name);

  constructor(
    @Inject('DATA_PROVIDER') private readonly dataProvider: MarketDataProvider,
  ) {}

  /**
   * Prepare data for backtesting
   */
  async prepareBacktestData(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      this.logger.log(
        `Preparing data for ${symbol} ${timeframe} from ${startDate} to ${endDate}`,
      );

      // Load raw data
      const rawData = await this.dataProvider.getHistoricalCandles(
        symbol,
        timeframe,
        startDate,
        endDate,
      );

      if (rawData.length === 0) {
        throw new Error('No data available for the specified period');
      }

      // Validate and clean data
      const cleanedData = this.cleanData(rawData);

      // Validate data quality
      this.validateDataQuality(cleanedData, symbol, timeframe);

      this.logger.log(
        `Data preparation completed: ${cleanedData.length} candles`,
      );
      return cleanedData;
    } catch (error) {
      this.logger.error('Failed to prepare backtest data:', error);
      throw error;
    }
  }

  /**
   * Clean and validate data
   */
  private cleanData(data: any[]): any[] {
    return data
      .filter((candle) => this.isValidCandle(candle))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((candle) => this.normalizeCandle(candle));
  }

  /**
   * Check if candle is valid
   */
  private isValidCandle(candle: any): boolean {
    return (
      candle &&
      candle.timestamp &&
      typeof candle.open === 'number' &&
      candle.open > 0 &&
      typeof candle.high === 'number' &&
      candle.high > 0 &&
      typeof candle.low === 'number' &&
      candle.low > 0 &&
      typeof candle.close === 'number' &&
      candle.close > 0 &&
      candle.high >= candle.low &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.low <= candle.open &&
      candle.low <= candle.close
    );
  }

  /**
   * Normalize candle data
   */
  private normalizeCandle(candle: any): any {
    return {
      symbol: candle.symbol,
      timestamp: new Date(candle.timestamp).getTime(),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume || 0),
      timeframe: candle.timeframe,
    };
  }

  /**
   * Validate data quality
   */
  private validateDataQuality(
    data: any[],
    symbol: string,
    timeframe: string,
  ): void {
    if (data.length === 0) {
      throw new Error('No valid data after cleaning');
    }

    // Check for gaps in data
    const gaps = this.findDataGaps(data);
    if (gaps.length > 0) {
      this.logger.warn(`Found ${gaps.length} data gaps for ${symbol}`);
    }

    // Check for price anomalies
    const anomalies = this.findPriceAnomalies(data);
    if (anomalies.length > 0) {
      this.logger.warn(
        `Found ${anomalies.length} price anomalies for ${symbol}`,
      );
    }

    // Check for sufficient data
    if (data.length < 100) {
      this.logger.warn(
        `Limited data available: ${data.length} candles for ${symbol}`,
      );
    }
  }

  /**
   * Find gaps in data
   */
  private findDataGaps(
    data: any[],
  ): Array<{ start: number; end: number; duration: number }> {
    const gaps: Array<{ start: number; end: number; duration: number }> = [];
    const expectedInterval = this.getExpectedInterval(data[0]?.timeframe);

    for (let i = 1; i < data.length; i++) {
      const timeDiff = data[i].timestamp - data[i - 1].timestamp;
      if (timeDiff > expectedInterval * 2) {
        gaps.push({
          start: data[i - 1].timestamp,
          end: data[i].timestamp,
          duration: timeDiff,
        });
      }
    }

    return gaps;
  }

  /**
   * Find price anomalies
   */
  private findPriceAnomalies(data: any[]): Array<{
    timestamp: number;
    priceChange: number;
    prevClose: number;
    currClose: number;
  }> {
    const anomalies: Array<{
      timestamp: number;
      priceChange: number;
      prevClose: number;
      currClose: number;
    }> = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      // Check for extreme price movements (>20% in one candle)
      const priceChange = Math.abs(curr.close - prev.close) / prev.close;
      if (priceChange > 0.2) {
        anomalies.push({
          timestamp: curr.timestamp,
          priceChange: priceChange,
          prevClose: prev.close,
          currClose: curr.close,
        });
      }
    }

    return anomalies;
  }

  /**
   * Get expected interval for timeframe
   */
  private getExpectedInterval(timeframe: string): number {
    const intervals = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return intervals[timeframe] || 15 * 60 * 1000;
  }

  /**
   * Get data summary
   */
  getDataSummary(data: any[]): any {
    if (data.length === 0) {
      return { candles: 0, startDate: null, endDate: null };
    }

    const prices = data.map((c) => c.close);
    const volumes = data.map((c) => c.volume);

    return {
      candles: data.length,
      startDate: new Date(data[0].timestamp),
      endDate: new Date(data[data.length - 1].timestamp),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
      avgVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
    };
  }
}
