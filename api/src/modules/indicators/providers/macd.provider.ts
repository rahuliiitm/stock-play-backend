import { IndicatorProvider, IndicatorResult, TechnicalIndicatorInput } from '../indicator-provider.interface'
import { Candle } from '../../../lib/market-data-sdk/models'
import { MACD } from 'technicalindicators'

export class MacdProvider implements IndicatorProvider {
  name = 'MACD'
  description = 'Moving Average Convergence Divergence - Trend-following momentum indicator'
  requiredParameters = ['fastPeriod', 'slowPeriod']
  optionalParameters = ['signalPeriod']
  minDataPoints = 26

  calculate(candles: Candle[], parameters: Record<string, any>): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null
    }

    const fastPeriod = parameters.fastPeriod || 12
    const slowPeriod = parameters.slowPeriod || 26
    const signalPeriod = parameters.signalPeriod || 9

    // Convert candles to technical indicators input format
    const input: TechnicalIndicatorInput = {
      close: candles.map(c => c.close)
    }

    try {
      const macdValues = MACD.calculate({
        values: input.close,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      })

      if (macdValues.length === 0) {
        return null
      }

      const latestMacd = macdValues[macdValues.length - 1]
      const timestamp = candles[candles.length - 1].time

      // Ensure MACD and signal values exist
      if (latestMacd.MACD === undefined || latestMacd.signal === undefined) {
        return null
      }

      return {
        value: latestMacd.MACD,
        additionalData: {
          fastPeriod,
          slowPeriod,
          signalPeriod,
          macd: latestMacd.MACD,
          signal: latestMacd.signal,
          histogram: latestMacd.histogram,
          isBullish: latestMacd.MACD > latestMacd.signal,
          isBearish: latestMacd.MACD < latestMacd.signal,
          allValues: macdValues
        },
        timestamp: new Date(timestamp)
      }
    } catch (error) {
      console.error('MACD calculation error:', error)
      return null
    }
  }
}
