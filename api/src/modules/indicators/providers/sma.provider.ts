import {
  IndicatorProvider,
  IndicatorResult,
  TechnicalIndicatorInput,
} from '../indicator-provider.interface';
import { Candle } from '../../../lib/market-data-sdk/models';
import { SMA } from 'technicalindicators';

export class SmaProvider implements IndicatorProvider {
  name = 'SMA';
  description =
    'Simple Moving Average - Average of prices over a specified period';
  requiredParameters = ['period'];
  optionalParameters = [];
  minDataPoints = 10;

  calculate(
    candles: Candle[],
    parameters: Record<string, any>,
  ): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null;
    }

    const period = parameters.period || 20;

    // Convert candles to technical indicators input format
    const input: TechnicalIndicatorInput = {
      close: candles.map((c) => c.close),
    };

    try {
      const smaValues = SMA.calculate({
        values: input.close,
        period: period,
      });

      if (smaValues.length === 0) {
        return null;
      }

      const latestSma = smaValues[smaValues.length - 1];
      const timestamp = candles[candles.length - 1].time;
      const currentPrice = input.close[input.close.length - 1];

      return {
        value: latestSma,
        additionalData: {
          period,
          currentPrice,
          priceVsSma: currentPrice - latestSma,
          priceVsSmaPercent: ((currentPrice - latestSma) / latestSma) * 100,
          allValues: smaValues,
        },
        timestamp: new Date(timestamp),
      };
    } catch (error) {
      console.error('SMA calculation error:', error);
      return null;
    }
  }
}
