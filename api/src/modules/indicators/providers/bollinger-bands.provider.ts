import {
  IndicatorProvider,
  IndicatorResult,
  TechnicalIndicatorInput,
} from '../indicator-provider.interface';
import { Candle } from '../../../lib/market-data-sdk/models';
import { BollingerBands } from 'technicalindicators';

export class BollingerBandsProvider implements IndicatorProvider {
  name = 'BOLLINGER_BANDS';
  description =
    'Bollinger Bands - Volatility indicator with upper and lower bands';
  requiredParameters = ['period'];
  optionalParameters = ['stdDev'];
  minDataPoints = 20;

  calculate(
    candles: Candle[],
    parameters: Record<string, any>,
  ): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null;
    }

    const period = parameters.period || 20;
    const stdDev = parameters.stdDev || 2;

    // Convert candles to technical indicators input format
    const input: TechnicalIndicatorInput = {
      close: candles.map((c) => c.close),
    };

    try {
      const bbValues = BollingerBands.calculate({
        values: input.close,
        period,
        stdDev,
      });

      if (bbValues.length === 0) {
        return null;
      }

      const latestBB = bbValues[bbValues.length - 1];
      const timestamp = candles[candles.length - 1].time;
      const currentPrice = input.close[input.close.length - 1];

      // Calculate position within bands (0 = at lower band, 1 = at upper band)
      const bandWidth = latestBB.upper - latestBB.lower;
      const positionInBand =
        bandWidth > 0 ? (currentPrice - latestBB.lower) / bandWidth : 0.5;

      return {
        value: latestBB.middle, // Use middle band as primary value
        additionalData: {
          period,
          stdDev,
          upper: latestBB.upper,
          middle: latestBB.middle,
          lower: latestBB.lower,
          currentPrice,
          positionInBand,
          isAboveUpper: currentPrice > latestBB.upper,
          isBelowLower: currentPrice < latestBB.lower,
          bandWidth,
          allValues: bbValues,
        },
        timestamp: new Date(timestamp),
      };
    } catch (error) {
      console.error('Bollinger Bands calculation error:', error);
      return null;
    }
  }
}
