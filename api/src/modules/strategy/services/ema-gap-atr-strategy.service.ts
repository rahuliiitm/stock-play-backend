import { Injectable, Logger } from '@nestjs/common'
import { EMA, ATR, RSI, ADX } from 'technicalindicators'
import { StrategySignal } from './strategy-building-blocks.service'
import { CandleQueryResult } from '../../trading/services/candle-query.service'

export interface EmaGapAtrConfig {
  id: string
  name?: string
  symbol: string
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'
  emaFastPeriod: number
  emaSlowPeriod: number
  atrPeriod: number
  minGapThreshold: number
  minGapMultiplier: number
  slopeLookback: number
  slopeMin?: number
  rsiPeriod: number
  rsiThreshold: number
  adxPeriod: number
  adxThreshold: number
  pyramiding: {
    multiplier: number
    maxLots: number
  }
  risk: {
    maxLossPerLot: number
    trailingAtrMultiplier: number
  }
  options: {
    enabled: boolean
    strikeSelection: {
      callStrikes: ('ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM')[]
      putStrikes: ('ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM')[]
      expiryDays?: number // Default to next Tuesday
    }
    lotSize?: number // Default 50 for NIFTY
    strikeIncrement?: number // Default 50 for NIFTY
  }
}

export interface StrategyEvaluation {
  signals: StrategySignal[]
  diagnostics: Record<string, any>
}

@Injectable()
export class EmaGapAtrStrategyService {
  private readonly logger = new Logger(EmaGapAtrStrategyService.name)

  evaluate(config: EmaGapAtrConfig, candles: CandleQueryResult[]): StrategyEvaluation {
    if (!candles || candles.length === 0) {
      return { signals: [], diagnostics: { reason: 'no_candles' } }
    }

    const closes = candles.map((c) => c.close)
    const highs = candles.map((c) => c.high)
    const lows = candles.map((c) => c.low)

    if (closes.length < config.emaSlowPeriod + 5) {
      return { signals: [], diagnostics: { reason: 'insufficient_data' } }
    }

    const fastSeries = EMA.calculate({ period: config.emaFastPeriod, values: closes })
    const slowSeries = EMA.calculate({ period: config.emaSlowPeriod, values: closes })
    const atrSeries = ATR.calculate({ period: config.atrPeriod, high: highs, low: lows, close: closes })
    const rsiSeries = RSI.calculate({ period: config.rsiPeriod, values: closes })
    const adxSeries = ADX.calculate({ period: config.adxPeriod, high: highs, low: lows, close: closes })

    if (!fastSeries.length || !slowSeries.length || !atrSeries.length || !rsiSeries.length || !adxSeries.length) {
      return { signals: [], diagnostics: { reason: 'indicator_calculation_failed' } }
    }

    const fast = fastSeries[fastSeries.length - 1]
    const fastPrev = fastSeries[fastSeries.length - 2] ?? fast

    const slow = slowSeries[slowSeries.length - 1]
    const slowPrev = slowSeries[slowSeries.length - 2] ?? slow

    const atr = atrSeries[atrSeries.length - 1]
    const rsi = rsiSeries[rsiSeries.length - 1]
    const latestAdx = adxSeries[adxSeries.length - 1]
    const adx = latestAdx?.adx ?? 0
    const pdi = latestAdx?.pdi ?? 0
    const mdi = latestAdx?.mdi ?? 0

    const latestCandle = candles[candles.length - 1]

    const fastSlope = this.computeSlope(fastSeries, config.slopeLookback)
    const gapAbs = fast - slow
    const gapNorm = atr > 0 ? gapAbs / atr : 0
    const crossedUp = fastPrev <= slowPrev && fast > slow
    const crossedDown = fastPrev >= slowPrev && fast < slow
    const isBullishTrend = fast > slow && fastSlope >= (config.slopeMin ?? 0)
    const isBearishTrend = fast < slow && fastSlope <= -(config.slopeMin ?? 0)

    const passesGap = Math.abs(gapAbs) >= config.minGapThreshold || Math.abs(gapNorm) >= config.minGapMultiplier
    const passesMomentum = rsi >= config.rsiThreshold && adx >= config.adxThreshold

    const diagnostics = {
      fast,
      slow,
      fastPrev,
      slowPrev,
      fastSlope,
      gapAbs,
      gapNorm,
      atr,
      rsi,
      adx,
      pdi,
      mdi,
      crossedUp,
      crossedDown,
      isBullishTrend,
      isBearishTrend,
      passesGap,
      passesMomentum,
      latestClose: latestCandle.close
    }

    const signals: StrategySignal[] = []

    // Check for entry signals
    if (crossedUp && isBullishTrend && passesGap && passesMomentum) {
      signals.push(this.buildEntrySignal('LONG', config, latestCandle, diagnostics))
    } else if (crossedDown && isBearishTrend && passesGap && passesMomentum) {
      signals.push(this.buildEntrySignal('SHORT', config, latestCandle, diagnostics))
    }

    // Check for exit signals (reverse conditions)
    if (crossedDown && isBearishTrend && passesGap && passesMomentum) {
      signals.push(this.buildExitSignal('LONG', config, latestCandle, diagnostics))
    } else if (crossedUp && isBullishTrend && passesGap && passesMomentum) {
      signals.push(this.buildExitSignal('SHORT', config, latestCandle, diagnostics))
    }

    return { signals, diagnostics }
  }

  private computeSlope(series: number[], lookback: number): number {
    if (!series.length) return 0
    const lb = Math.max(1, lookback)
    const latest = series[series.length - 1]
    const pastIndex = Math.max(0, series.length - 1 - lb)
    const past = series[pastIndex]
    return (latest - past) / lb
  }

  private buildEntrySignal(
    direction: 'LONG' | 'SHORT',
    config: EmaGapAtrConfig,
    candle: CandleQueryResult,
    diagnostics: Record<string, any>
  ): StrategySignal {
    const baseStrength = Math.min(100, Math.abs(diagnostics.gapNorm || 0) * 20 + (diagnostics.adx || 0))
    const confidence = Math.min(100, (diagnostics.rsi || 0))

    const signalData: any = {
      direction,
      price: candle.close,
      symbol: config.symbol,
      timeframe: config.timeframe,
      diagnostics
    }

    // Add option strike selection if enabled
    if (config.options?.enabled) {
      signalData.options = {
        strikeSelection: config.options.strikeSelection,
        lotSize: config.options.lotSize || 50,
        strikeIncrement: config.options.strikeIncrement || 50
      }
    }

    return {
      type: 'ENTRY',
      strength: baseStrength,
      confidence,
      timestamp: new Date(candle.timestamp),
      data: signalData
    }
  }

  private buildExitSignal(
    direction: 'LONG' | 'SHORT',
    config: EmaGapAtrConfig,
    candle: CandleQueryResult,
    diagnostics: Record<string, any>
  ): StrategySignal {
    const baseStrength = Math.min(100, Math.abs(diagnostics.gapNorm || 0) * 20 + (diagnostics.adx || 0))
    const confidence = Math.min(100, (diagnostics.rsi || 0))

    const signalData: any = {
      direction,
      price: candle.close,
      symbol: config.symbol,
      timeframe: config.timeframe,
      diagnostics
    }

    return {
      type: 'EXIT',
      strength: baseStrength,
      confidence,
      timestamp: new Date(candle.timestamp),
      data: signalData
    }
  }
}



