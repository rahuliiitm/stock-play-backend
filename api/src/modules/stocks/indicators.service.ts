import { Injectable } from '@nestjs/common'
import type { Candle } from '../../lib/market-data-sdk/models'
import { rsi as sdkRsi, sma as sdkSma, macd as sdkMacd } from '../../lib/market-data-sdk/indicators'

@Injectable()
export class IndicatorsService {
  rsi(candles: Candle[], period = 14) {
    return sdkRsi(candles, period)
  }

  ma(candles: Candle[], period = 20) {
    return sdkSma(candles, period)
  }

  macd(candles: Candle[], short = 12, long = 26, signal = 9) {
    return sdkMacd(candles, short, long, signal)
  }
} 