import { IndicatorProvider, IndicatorResult } from '../indicator-provider.interface'
import { Candle } from '../../../lib/market-data-sdk/models'
import { EMA } from 'technicalindicators'

export class EmaProvider implements IndicatorProvider {
  name = 'EMA'
  description = 'Exponential Moving Average with optional slope metrics'
  requiredParameters = ['period']
  optionalParameters = ['slopeLookback']
  minDataPoints = 15

  calculate(candles: Candle[], parameters: Record<string, any>): IndicatorResult | null {
    if (!candles || candles.length < this.minDataPoints) {
      return null
    }

    const period = Number(parameters.period) || 20
    const slopeLookback = Number(parameters.slopeLookback) || Math.min(5, Math.max(1, Math.floor(period / 2)))

    if (candles.length < period + slopeLookback + 1) {
      return null
    }

    const closeValues = candles.map(c => c.close)

    try {
      const emaValues = EMA.calculate({ period, values: closeValues })
      if (emaValues.length === 0) {
        return null
      }

      const latestEma = emaValues[emaValues.length - 1]
      const timestamp = candles[candles.length - 1].time
      const currentPrice = closeValues[closeValues.length - 1]

      const previousIndex = emaValues.length - 1 - slopeLookback
      const previousEma = previousIndex >= 0 ? emaValues[previousIndex] : emaValues[0]
      const slope = (latestEma - previousEma) / slopeLookback
      const gapToPrice = currentPrice - latestEma

      return {
        value: latestEma,
        additionalData: {
          period,
          slopeLookback,
          slope,
          previousEma,
          gapToPrice,
          gapPercent: latestEma !== 0 ? (gapToPrice / latestEma) * 100 : 0,
          allValues: emaValues
        },
        timestamp: new Date(timestamp)
      }
    } catch (error) {
      console.error('EMA calculation error:', error)
      return null
    }
  }
}


