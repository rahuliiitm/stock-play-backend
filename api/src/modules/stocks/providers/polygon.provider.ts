import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'

@Injectable()
export class PolygonProvider implements QuotesProvider {
  constructor(private readonly http: HttpService) {}

  private apiKey() {
    return process.env.STOCK_PROVIDER_API_KEY || ''
  }

  async getQuote(symbol: string): Promise<QuoteResult> {
    return { symbol, priceCents: 10000, asOf: new Date().toISOString(), source: 'polygon' }
  }

  async getHistory(symbol: string, _from?: string, _to?: string, _intervalMinutes?: number): Promise<CandleResult[]> {
    return [
      { time: new Date(Date.now() - 3600_000).toISOString(), open: 100, high: 101, low: 99, close: 100.5, volume: 500 },
      { time: new Date().toISOString(), open: 100.5, high: 102, low: 100, close: 101.2, volume: 700 },
    ]
  }
} 