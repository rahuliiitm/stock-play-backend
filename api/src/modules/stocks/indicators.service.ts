import { Injectable } from '@nestjs/common'

export interface Candle { time: string; open: number; high: number; low: number; close: number; volume: number }

@Injectable()
export class IndicatorsService {
  rsi(candles: Candle[], period = 14) {
    if (candles.length < period + 1) return null
    let gains = 0
    let losses = 0
    for (let i = 1; i <= period; i++) {
      const diff = candles[i].close - candles[i - 1].close
      if (diff >= 0) gains += diff
      else losses -= diff
    }
    const rs = losses === 0 ? 100 : gains / (losses || 1)
    const rsi = 100 - 100 / (1 + rs)
    return Number(rsi.toFixed(2))
  }

  ma(candles: Candle[], period = 20) {
    if (candles.length < period) return null
    const sum = candles.slice(-period).reduce((s, c) => s + c.close, 0)
    return Number((sum / period).toFixed(2))
  }

  macd(candles: Candle[], short = 12, long = 26, signal = 9) {
    if (candles.length < long + signal) return null
    const ema = (arr: number[], p: number) => {
      const k = 2 / (p + 1)
      let prev = arr[0]
      for (let i = 1; i < arr.length; i++) prev = arr[i] * k + prev * (1 - k)
      return prev
    }
    const closes = candles.map((c) => c.close)
    const emaShort = ema(closes.slice(-long), short)
    const emaLong = ema(closes.slice(-long), long)
    const macd = emaShort - emaLong
    const signalLine = ema(closes.slice(-long), signal)
    const hist = macd - signalLine
    return { macd: Number(macd.toFixed(2)), signal: Number(signalLine.toFixed(2)), histogram: Number(hist.toFixed(2)) }
  }
} 