import { Injectable, Logger } from '@nestjs/common';

/**
 * Generic Warm-up Period Calculator
 * 
 * This service automatically analyzes any strategy configuration and calculates
 * the minimum number of candles needed for reliable indicator values.
 * 
 * It detects all indicators used in a strategy and returns the maximum
 * warm-up period required by any of them.
 */
@Injectable()
export class WarmupCalculatorService {
  private readonly logger = new Logger(WarmupCalculatorService.name);

  /**
   * Calculate warm-up period for any strategy configuration
   * @param config - Strategy configuration object
   * @returns Number of candles to skip for warm-up period
   */
  calculateWarmupPeriod(config: any): number {
    this.logger.debug(`Calculating warm-up period for strategy: ${config.name || 'Unknown'}`);
    
    const indicatorPeriods: number[] = [];
    
    // Detect and calculate periods for all possible indicators
    this.detectIndicatorPeriods(config, indicatorPeriods);
    
    // Add buffer period for stability
    const bufferPeriod = 10;
    
    // Calculate maximum period needed
    const maxPeriod = Math.max(...indicatorPeriods, 0);
    const warmupPeriod = maxPeriod + bufferPeriod;
    
    this.logger.debug(`Detected indicator periods: ${indicatorPeriods.join(', ')}`);
    this.logger.debug(`Maximum period: ${maxPeriod}, Buffer: ${bufferPeriod}, Final warm-up: ${warmupPeriod}`);
    
    return warmupPeriod;
  }

  /**
   * Recursively detect all indicator periods in a configuration object
   * @param obj - Configuration object to analyze
   * @param periods - Array to collect detected periods
   */
  private detectIndicatorPeriods(obj: any, periods: number[]): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach(item => this.detectIndicatorPeriods(item, periods));
      return;
    }

    // Handle objects
    for (const [key, value] of Object.entries(obj)) {
      // Skip non-numeric values
      if (typeof value !== 'number') {
        this.detectIndicatorPeriods(value, periods);
        continue;
      }

      // Detect indicator periods based on common naming patterns
      const period = this.extractIndicatorPeriod(key, value);
      if (period > 0) {
        periods.push(period);
        this.logger.debug(`Detected indicator: ${key} = ${value} (period: ${period})`);
      }
    }
  }

  /**
   * Extract indicator period from a configuration key-value pair
   * @param key - Configuration key
   * @param value - Configuration value
   * @returns Calculated period for the indicator
   */
  private extractIndicatorPeriod(key: string, value: number): number {
    const keyLower = key.toLowerCase();
    
    // EMA indicators
    if (keyLower.includes('ema') && (keyLower.includes('period') || keyLower.includes('fast') || keyLower.includes('slow'))) {
      return value;
    }
    
    // MACD indicators
    if (keyLower.includes('macd') && (keyLower.includes('period') || keyLower.includes('fast') || keyLower.includes('slow') || keyLower.includes('signal'))) {
      return value;
    }
    
    // RSI indicators
    if (keyLower.includes('rsi') && keyLower.includes('period')) {
      return value;
    }
    
    // ATR indicators
    if (keyLower.includes('atr') && keyLower.includes('period')) {
      return value;
    }
    
    // Supertrend indicators
    if (keyLower.includes('supertrend') && keyLower.includes('period')) {
      return value;
    }
    
    // Bollinger Bands
    if (keyLower.includes('bb') && keyLower.includes('period')) {
      return value;
    }
    
    // Stochastic indicators
    if (keyLower.includes('stoch') && keyLower.includes('period')) {
      return value;
    }
    
    // Williams %R
    if (keyLower.includes('williams') && keyLower.includes('period')) {
      return value;
    }
    
    // CCI (Commodity Channel Index)
    if (keyLower.includes('cci') && keyLower.includes('period')) {
      return value;
    }
    
    // ADX (Average Directional Index)
    if (keyLower.includes('adx') && keyLower.includes('period')) {
      return value;
    }
    
    // Parabolic SAR
    if (keyLower.includes('sar') && keyLower.includes('period')) {
      return value;
    }
    
    // Ichimoku Cloud components
    if (keyLower.includes('ichimoku') && keyLower.includes('period')) {
      return value;
    }
    
    // Generic period indicators
    if (keyLower.includes('period') && value > 0) {
      return value;
    }
    
    // Lookback periods
    if (keyLower.includes('lookback') && value > 0) {
      return value;
    }
    
    // Window periods
    if (keyLower.includes('window') && value > 0) {
      return value;
    }
    
    // Length parameters
    if (keyLower.includes('length') && value > 0) {
      return value;
    }
    
    return 0;
  }

  /**
   * Get detailed analysis of warm-up period calculation
   * @param config - Strategy configuration object
   * @returns Detailed analysis object
   */
  getWarmupAnalysis(config: any): {
    warmupPeriod: number;
    detectedIndicators: Array<{ name: string; period: number; type: string }>;
    recommendations: string[];
  } {
    const indicatorPeriods: number[] = [];
    const detectedIndicators: Array<{ name: string; period: number; type: string }> = [];
    
    this.detectIndicatorPeriodsWithDetails(config, indicatorPeriods, detectedIndicators);
    
    const maxPeriod = Math.max(...indicatorPeriods, 0);
    const bufferPeriod = 10;
    const warmupPeriod = maxPeriod + bufferPeriod;
    
    const recommendations: string[] = [];
    
    if (warmupPeriod > 100) {
      recommendations.push('Consider using shorter indicator periods to reduce warm-up time');
    }
    
    if (detectedIndicators.length === 0) {
      recommendations.push('No indicators detected - using default warm-up period');
    }
    
    if (maxPeriod > 50) {
      recommendations.push('Long indicator periods detected - ensure sufficient historical data');
    }
    
    return {
      warmupPeriod,
      detectedIndicators,
      recommendations,
    };
  }

  /**
   * Detect indicator periods with detailed information
   * @param obj - Configuration object
   * @param periods - Array to collect periods
   * @param indicators - Array to collect indicator details
   */
  private detectIndicatorPeriodsWithDetails(
    obj: any, 
    periods: number[], 
    indicators: Array<{ name: string; period: number; type: string }>
  ): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.detectIndicatorPeriodsWithDetails(item, periods, indicators));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== 'number') {
        this.detectIndicatorPeriodsWithDetails(value, periods, indicators);
        continue;
      }

      const period = this.extractIndicatorPeriod(key, value);
      if (period > 0) {
        periods.push(period);
        indicators.push({
          name: key,
          period: value,
          type: this.getIndicatorType(key),
        });
      }
    }
  }

  /**
   * Get indicator type from key name
   * @param key - Configuration key
   * @returns Indicator type
   */
  private getIndicatorType(key: string): string {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('ema')) return 'EMA';
    if (keyLower.includes('macd')) return 'MACD';
    if (keyLower.includes('rsi')) return 'RSI';
    if (keyLower.includes('atr')) return 'ATR';
    if (keyLower.includes('supertrend')) return 'Supertrend';
    if (keyLower.includes('bb')) return 'Bollinger Bands';
    if (keyLower.includes('stoch')) return 'Stochastic';
    if (keyLower.includes('williams')) return 'Williams %R';
    if (keyLower.includes('cci')) return 'CCI';
    if (keyLower.includes('adx')) return 'ADX';
    if (keyLower.includes('sar')) return 'Parabolic SAR';
    if (keyLower.includes('ichimoku')) return 'Ichimoku';
    
    return 'Generic';
  }
}
