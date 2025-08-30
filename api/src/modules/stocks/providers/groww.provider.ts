import { Injectable, Logger } from '@nestjs/common'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'
import { GrowwAPI, Exchange, Segment } from 'growwapi'

@Injectable()
export class GrowwProvider implements QuotesProvider {
  private readonly logger = new Logger(GrowwProvider.name)
  private readonly groww: GrowwAPI

  constructor() {
    this.groww = new GrowwAPI()
  }

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
      const quote = await this.groww.liveData.getQuote({
        tradingSymbol: s,
        exchange: Exchange.NSE,
        segment: Segment.CASH
      })
      
      return {
        symbol: s,
        price: quote.lastPrice,
        asOf: new Date().toISOString(),
        source: 'groww',
        open: quote.ohlc?.open,
        high: quote.ohlc?.high,
        low: quote.ohlc?.low,
        prevClose: quote.ohlc?.close,
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
      
      const historicalData = await this.groww.historicData.get({
        tradingSymbol: s,
        exchange: Exchange.NSE,
        segment: Segment.CASH,
        startTime: fromDate.toISOString(),
        endTime: toDate.toISOString()
      })
      
      return historicalData.candles?.map((candle: any) => ({
        time: candle.time || candle.timestamp || new Date().toISOString(),
        open: candle.open || 0,
        high: candle.high || 0,
        low: candle.low || 0,
        close: candle.close || 0,
        volume: candle.volume || 0
      })) || []
    } catch (e: any) {
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww history error for ${s}: ${msg}`)
      return []
    }
  }
} 