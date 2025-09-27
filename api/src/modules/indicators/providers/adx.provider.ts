import { IndicatorProvider, IndicatorResult } from '../indicator-provider.interface'
import { Candle } from '../../../lib/market-data-sdk/models'
import { ADX } from 'technicalindicators'

export class AdxProvider implements IndicatorProvider {
  name = 'ADX'
  description = 'Average Directional Index - trend strength indicator'
  requiredParameters = ['period']
  optionalParameters = []
  minDataPoints = 30

  calculate(candles: Candle[], parameters: Record<string, any>): IndicatorResult | null {
    if (!candles || candles.length < this.minDataPoints) {
      return null
    }

    const period = Number(parameters.period) || 14

    if (candles.length < period + 2) {
      return null
    }

    const high = candles.map(c => c.high)
    const low = candles.map(c => c.low)
    const close = candles.map(c => c.close)

    try {
      const adxValues = ADX.calculate({ high, low, close, period })
      if (adxValues.length === 0) {
        return null
      }

      const latest = adxValues[adxValues.length - 1]
      const timestamp = candles[candles.length - 1].time

      return {
        value: latest.adx ?? 0,
        additionalData: {
          period,
          adx: latest.adx ?? 0,
          plusDI: latest.pdi ?? 0,
          minusDI: latest.mdi ?? 0,
          trendDirection: (latest.pdi ?? 0) >= (latest.mdi ?? 0) ? 'bullish' : 'bearish',
          allValues: adxValues
        },
        timestamp: new Date(timestamp)
      }
    } catch (error) {
      console.error('ADX calculation error:', error)
      return null
    }
  }
}


