import {
  IndicatorProvider,
  IndicatorResult,
  TechnicalIndicatorInput,
} from '../indicator-provider.interface';
import { Candle } from '../../../lib/market-data-sdk/models';
import { RSI } from 'technicalindicators';

export class RsiProvider implements IndicatorProvider {
  name = 'RSI';
  description =
    'Relative Strength Index - Momentum oscillator that measures the speed and change of price movements';
  requiredParameters = ['period'];
  optionalParameters = ['overbought', 'oversold'];
  minDataPoints = 14;

  calculate(
    candles: Candle[],
    parameters: Record<string, any>,
  ): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null;
    }

    const period = parameters.period || 14;
    const overbought = parameters.overbought || 70;
    const oversold = parameters.oversold || 30;

    // Convert candles to technical indicators input format
    const input: TechnicalIndicatorInput = {
      close: candles.map((c) => c.close),
    };

    try {
      const rsiValues = RSI.calculate({
        values: input.close,
        period: period,
      });

      if (rsiValues.length === 0) {
        return null;
      }

      const latestRsi = rsiValues[rsiValues.length - 1];
      const timestamp = candles[candles.length - 1].time;

      return {
        value: latestRsi,
        additionalData: {
          overbought,
          oversold,
          isOverbought: latestRsi > overbought,
          isOversold: latestRsi < oversold,
          allValues: rsiValues,
        },
        timestamp: new Date(timestamp),
      };
    } catch (error) {
      console.error('RSI calculation error:', error);
      return null;
    }
  }
}
