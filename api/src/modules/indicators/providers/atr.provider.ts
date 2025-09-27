import { IndicatorProvider, IndicatorResult } from '../indicator-provider.interface'
import { Candle } from '../../../lib/market-data-sdk/models'
import { ATR } from 'technicalindicators'

export class AtrProvider implements IndicatorProvider {
  name = 'ATR'
  description = 'Average True Range - measures market volatility'
  requiredParameters = ['period']
  optionalParameters = []
  minDataPoints = 20

  calculate(candles: Candle[], parameters: Record<string, any>): IndicatorResult | null {
    if (!candles || candles.length < this.minDataPoints) {
      return null
    }

    const period = Number(parameters.period) || 14

    if (candles.length < period + 1) {
      return null
    }

    const high = candles.map(c => c.high)
    const low = candles.map(c => c.low)
    const close = candles.map(c => c.close)

    try {
      const atrValues = ATR.calculate({ high, low, close, period })
      if (atrValues.length === 0) {
        return null
      }

      const latestAtr = atrValues[atrValues.length - 1]
      const timestamp = candles[candles.length - 1].time

      return {
        value: latestAtr,
        additionalData: {
          period,
          allValues: atrValues
        },
        timestamp: new Date(timestamp)
      }
    } catch (error) {
      console.error('ATR calculation error:', error)
      return null
    }
  }
}


