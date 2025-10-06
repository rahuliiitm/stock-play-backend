import { Injectable, Logger } from '@nestjs/common';
import { IndicatorCalculationService } from '../../indicators/indicator-calculation.service';
import { IndicatorProviderRegistryService } from '../../indicators/indicator-provider-registry.service';
import { CandleData } from '../interfaces/strategy.interface';
import { Candle } from '../../../lib/market-data-sdk/models';

/**
 * Strategy Indicators Service
 * 
 * This service provides a simplified interface for strategies to access
 * technical indicators. It acts as a bridge between the existing
 * indicators module and strategy services.
 */
@Injectable()
export class StrategyIndicatorsService {
  private readonly logger = new Logger(StrategyIndicatorsService.name);

  constructor(
    private readonly indicatorCalculation: IndicatorCalculationService,
    private readonly providerRegistry: IndicatorProviderRegistryService,
  ) {}

  /**
   * Calculate MACD indicator for strategy use
   * @param candles - Array of candle data
   * @param fastPeriod - Fast EMA period (default: 12)
   * @param slowPeriod - Slow EMA period (default: 26)
   * @param signalPeriod - Signal line EMA period (default: 9)
   * @returns MACD result with metadata
   */
  calculateMACD(
    candles: CandleData[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ) {
    try {
      const provider = this.providerRegistry.get('MACD');
      if (!provider) {
        this.logger.error('MACD provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        fastPeriod,
        slowPeriod,
        signalPeriod,
      });

      if (!result) {
        return null;
      }

      return {
        macd: result.value,
        signal: result.additionalData?.signal,
        histogram: result.additionalData?.histogram,
        isBullish: result.additionalData?.isBullish || false,
        isBearish: result.additionalData?.isBearish || false,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating MACD:', error);
      return null;
    }
  }

  /**
   * Calculate Supertrend indicator for strategy use
   * @param candles - Array of candle data
   * @param period - Supertrend period (default: 10)
   * @param multiplier - Supertrend multiplier (default: 2.0)
   * @returns Supertrend result with metadata
   */
  calculateSupertrend(
    candles: CandleData[],
    period: number = 10,
    multiplier: number = 2.0
  ) {
    try {
      const provider = this.providerRegistry.get('SUPERTREND');
      if (!provider) {
        this.logger.error('Supertrend provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        period,
        multiplier,
      });

      if (!result) {
        return null;
      }

      return {
        supertrend: result.value,
        trendDirection: result.additionalData?.trendDirection,
        signalStrength: result.additionalData?.signalStrength,
        isBullish: result.additionalData?.trendDirection === 'UPTREND',
        isBearish: result.additionalData?.trendDirection === 'DOWNTREND',
        signal: result.additionalData?.signal,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating Supertrend:', error);
      return null;
    }
  }

  /**
   * Calculate ATR (Average True Range) indicator for strategy use
   * @param candles - Array of candle data
   * @param period - ATR period (default: 14)
   * @returns ATR result with metadata
   */
  calculateATR(candles: CandleData[], period: number = 14) {
    try {
      const provider = this.providerRegistry.get('ATR');
      if (!provider) {
        this.logger.error('ATR provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        period,
      });

      if (!result) {
        return null;
      }

      return {
        atr: result.value,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating ATR:', error);
      return null;
    }
  }

  /**
   * Calculate EMA (Exponential Moving Average) for strategy use
   * @param candles - Array of candle data
   * @param period - EMA period
   * @returns EMA result with metadata
   */
  calculateEMA(candles: CandleData[], period: number) {
    try {
      const provider = this.providerRegistry.get('EMA');
      if (!provider) {
        this.logger.error('EMA provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        period,
      });

      if (!result) {
        return null;
      }

      return {
        ema: result.value,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating EMA:', error);
      return null;
    }
  }

  /**
   * Calculate RSI (Relative Strength Index) for strategy use
   * @param candles - Array of candle data
   * @param period - RSI period (default: 14)
   * @returns RSI result with metadata
   */
  calculateRSI(candles: CandleData[], period: number = 14) {
    try {
      const provider = this.providerRegistry.get('RSI');
      if (!provider) {
        this.logger.error('RSI provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        period,
      });

      if (!result) {
        return null;
      }

      return {
        rsi: result.value,
        isOverbought: result.additionalData?.isOverbought || false,
        isOversold: result.additionalData?.isOversold || false,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating RSI:', error);
      return null;
    }
  }

  /**
   * Calculate DEMA (Double Exponential Moving Average) for strategy use
   * @param candles - Array of candle data
   * @param period - DEMA period (default: 20)
   * @returns DEMA result with metadata
   */
  calculateDEMA(candles: CandleData[], period: number = 20) {
    try {
      const provider = this.providerRegistry.get('DEMA');
      if (!provider) {
        this.logger.error('DEMA provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        period,
      });

      if (!result) {
        return null;
      }

      return {
        dema: result.value,
        isAbovePrice: result.additionalData?.isAbovePrice || false,
        isBelowPrice: result.additionalData?.isBelowPrice || false,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating DEMA:', error);
      return null;
    }
  }

  /**
   * Calculate Bollinger Bands for strategy use
   * @param candles - Array of candle data
   * @param period - BB period (default: 20)
   * @param stdDev - Standard deviation (default: 2)
   * @returns Bollinger Bands result with metadata
   */
  calculateBollingerBands(
    candles: CandleData[],
    period: number = 20,
    stdDev: number = 2
  ) {
    try {
      const provider = this.providerRegistry.get('BOLLINGER_BANDS');
      if (!provider) {
        this.logger.error('Bollinger Bands provider not found');
        return null;
      }

      // Convert CandleData to Candle format
      const convertedCandles = this.convertCandleDataToCandle(candles);
      
      const result = provider.calculate(convertedCandles, {
        period,
        stdDev,
      });

      if (!result) {
        return null;
      }

      return {
        upper: result.additionalData?.upper,
        middle: result.additionalData?.middle,
        lower: result.additionalData?.lower,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating Bollinger Bands:', error);
      return null;
    }
  }

  /**
   * Calculate multiple indicators at once for efficiency
   * @param candles - Array of candle data
   * @param indicators - Object with indicator configurations
   * @returns Object with all calculated indicators
   */
  calculateMultiple(candles: CandleData[], indicators: Record<string, any>) {
    const results: Record<string, any> = {};

    for (const [name, config] of Object.entries(indicators)) {
      try {
        switch (name.toLowerCase()) {
          case 'macd':
            results[name] = this.calculateMACD(
              candles,
              config.fastPeriod,
              config.slowPeriod,
              config.signalPeriod
            );
            break;
          case 'supertrend':
            results[name] = this.calculateSupertrend(
              candles,
              config.period,
              config.multiplier
            );
            break;
          case 'atr':
            results[name] = this.calculateATR(candles, config.period);
            break;
          case 'ema':
            results[name] = this.calculateEMA(candles, config.period);
            break;
          case 'rsi':
            results[name] = this.calculateRSI(candles, config.period);
            break;
          case 'bollingerbands':
            results[name] = this.calculateBollingerBands(
              candles,
              config.period,
              config.stdDev
            );
            break;
          case 'dema':
            results[name] = this.calculateDEMA(candles, config.period);
            break;
          default:
            this.logger.warn(`Unknown indicator: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Error calculating ${name} indicator:`, error);
        results[name] = null;
      }
    }

    return results;
  }

  /**
   * Get all available indicators
   * @returns Array of available indicator names
   */
  getAvailableIndicators() {
    return this.providerRegistry.getAllProviderInfo().map(provider => provider.name);
  }

  /**
   * Convert CandleData to Candle format for existing providers
   * @param candles - Array of CandleData
   * @returns Array of Candle objects
   */
  private convertCandleDataToCandle(candles: CandleData[]): Candle[] {
    return candles.map(candle => ({
      time: new Date(candle.timestamp).toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume || 0,
    }));
  }

  /**
   * Get the minimum number of candles required for reliable calculation
   * @param indicatorName - Name of the indicator
   * @returns Minimum number of candles needed
   */
  getMinPeriod(indicatorName: string): number {
    const provider = this.providerRegistry.get(indicatorName);
    return provider?.minDataPoints || 20;
  }

  /**
   * Validate indicator configuration
   * @param indicatorName - Name of the indicator
   * @param parameters - Configuration parameters
   * @returns Validation result
   */
  validateConfig(indicatorName: string, parameters: Record<string, any>) {
    const provider = this.providerRegistry.get(indicatorName);
    if (!provider) {
      return { isValid: false, errors: [`Indicator provider not found: ${indicatorName}`] };
    }

    const errors: string[] = [];

    // Check required parameters
    for (const param of provider.requiredParameters) {
      if (!(param in parameters)) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  calculateSupportResistance(candles: CandleData[], options: Record<string, any> = {}) {
    try {
      const provider = this.providerRegistry.get('SUPPORT_RESISTANCE');
      if (!provider) {
        this.logger.error('Support/Resistance provider not found');
        return null;
      }

      const convertedCandles = this.convertCandleDataToCandle(candles);
      const result = provider.calculate(convertedCandles, options);
      if (!result) {
        return null;
      }

      return {
        level: result.value,
        metadata: result.additionalData,
      };
    } catch (error) {
      this.logger.error('Error calculating Support/Resistance:', error);
      return null;
    }
  }
}
