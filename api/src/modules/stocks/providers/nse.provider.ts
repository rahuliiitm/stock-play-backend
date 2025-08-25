import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'
import { NseSource } from '../../../lib/market-data-sdk/sources/nse'

@Injectable()
export class NseProvider implements QuotesProvider {
  private readonly source: NseSource

  constructor(private readonly http: HttpService) {
    const httpGet = async (url: string, options?: { headers?: Record<string, string>; params?: Record<string, any> }) => {
      const { data } = await this.http.axiosRef.get(url, { headers: options?.headers, params: options?.params })
      return data
    }
    this.source = new NseSource({
      httpGet,
      baseUrl: process.env.NSE_API_BASE || 'https://nse.example.com',
      quotePath: process.env.NSE_QUOTE_PATH || '/api/quote',
      historyDailyPath: process.env.NSE_HISTORY_DAILY_PATH || '/api/history',
      defaultHeaders: {},
    })
  }

  async getQuote(symbol: string): Promise<QuoteResult> {
    return this.source.getQuote(symbol)
  }

  async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<CandleResult[]> {
    // Always fetch daily data from NSE source; ignore intraday intervals for now
    return this.source.getHistory(symbol, from, to, 1440)
  }
} 