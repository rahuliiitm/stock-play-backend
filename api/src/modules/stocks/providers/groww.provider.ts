import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'
import { GrowwAuthService } from './groww-auth.service'
import { GrowwSource } from '../../../lib/market-data-sdk/sources/groww'

@Injectable()
export class GrowwProvider implements QuotesProvider {
  private readonly logger = new Logger(GrowwProvider.name)
  private readonly source: GrowwSource

  constructor(private readonly http: HttpService, private readonly auth: GrowwAuthService) {
    const httpGet = async (url: string, options?: { headers?: Record<string, string>; params?: Record<string, any> }) => {
      const { data } = await this.http.axiosRef.get(url, { headers: options?.headers, params: options?.params })
      return data
    }
    this.source = new GrowwSource({
      httpGet,
      getAccessToken: async () => this.auth.getAccessToken().catch(() => null),
      baseUrl: this.baseUrl(),
      apiKey: process.env.GROWW_API_KEY,
      appId: process.env.GROWW_APP_ID,
    })
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
      const result = await this.source.getQuote(s)
      return result
    } catch (e: any) {
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww quote error for ${s}: ${msg}`)
      throw e
    }
  }

  async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<CandleResult[]> {
    const s = this.mapSymbol(symbol)
    try {
      const candles = await this.source.getHistory(s, from, to, intervalMinutes)
      return candles
    } catch (e: any) {
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww history error for ${s}: ${msg}`)
      return []
    }
  }
} 