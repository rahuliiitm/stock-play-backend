import { Injectable, Logger } from '@nestjs/common'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'
import { GrowwApiService } from '../../broker/services/groww-api.service'

@Injectable()
export class GrowwProvider implements QuotesProvider {
  private readonly logger = new Logger(GrowwProvider.name)

  constructor(private readonly groww: GrowwApiService) {}

  private baseUrl() {
    return process.env.GROWW_API_BASE || 'https://api.groww.in'
  }

  private exchange() {
    return process.env.GROWW_EXCHANGE || 'NSE'
  }

  private segment() {
    return process.env.GROWW_SEGMENT || 'CASH'
  }

  private quotePath() {
    return process.env.GROWW_QUOTE_PATH || '/v1/live-data/quote'
  }

  private historyPath() {
    return process.env.GROWW_HISTORY_PATH || '/v1/historical/candle/range'
  }

  private mapSymbol(symbol: string) {
    return symbol
  }

  async getQuote(symbol: string): Promise<QuoteResult> {
    const s = this.mapSymbol(symbol)
    try {
      const data = await this.groww.getQuote(s)
      return {
        symbol: s,
        price: Number(data?.ltp || data?.price || 0),
        asOf: new Date().toISOString(),
        source: 'groww',
        open: data?.ohlc?.open,
        high: data?.ohlc?.high,
        low: data?.ohlc?.low,
        prevClose: data?.ohlc?.close,
      }
    } catch (e: any) {
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww quote error for ${s}: ${msg}`)
      throw e
    }
  }

  async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<CandleResult[]> {
    const s = this.mapSymbol(symbol)
    try {
      const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const toDate = to ? new Date(to) : new Date()
      const interval = intervalMinutes && intervalMinutes <= 60 ? '1m' : '1D'

      const candles = await this.groww.getHistoricalData(
        s,
        fromDate.toISOString(),
        toDate.toISOString(),
        interval,
      )

      return (candles || []).map((candle: any) => ({
        time: candle.time || candle.timestamp || candle[0] || new Date().toISOString(),
        open: candle.open || candle[1] || 0,
        high: candle.high || candle[2] || 0,
        low: candle.low || candle[3] || 0,
        close: candle.close || candle[4] || 0,
        volume: candle.volume || candle[5] || 0,
      }))
    } catch (e: any) {
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww history error for ${s}: ${msg}`)
      return []
    }
  }
} 