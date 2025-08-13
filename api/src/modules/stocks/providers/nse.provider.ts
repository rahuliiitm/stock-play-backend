import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'

@Injectable()
export class NseProvider implements QuotesProvider {
  constructor(private readonly http: HttpService) {}

  private baseUrl() {
    return process.env.NSE_API_BASE || 'https://nse.example.com'
  }

  private headers() {
    const h: Record<string, string> = {}
    if (process.env.NSE_API_KEY) h['x-api-key'] = process.env.NSE_API_KEY
    return h
  }

  async getQuote(symbol: string): Promise<QuoteResult> {
    try {
      // Example shape; replace with real NSE/BSE endpoint
      // const { data } = await this.http.axiosRef.get(`${this.baseUrl()}/quote/${symbol}`, { headers: this.headers() })
      // const last = data.lastPrice; const ts = data.timestamp;
      const last = 100.0
      const ts = new Date().toISOString()
      return { symbol, priceCents: Math.round(last * 100), asOf: ts, source: 'nse' }
    } catch {
      return { symbol, priceCents: 10000, asOf: new Date().toISOString(), source: 'nse-fallback' }
    }
  }

  async getHistory(symbol: string, _from?: string, _to?: string, _intervalMinutes?: number): Promise<CandleResult[]> {
    try {
      // Example shape; replace with real NSE/BSE endpoint
      // const { data } = await this.http.axiosRef.get(`${this.baseUrl()}/history/${symbol}`, { params: { from, to, interval }, headers: this.headers() })
      // return data.candles.map(c => ({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v }))
      return [
        { time: new Date(Date.now() - 3600_000).toISOString(), open: 100, high: 102, low: 99, close: 101, volume: 10000 },
        { time: new Date().toISOString(), open: 101, high: 103, low: 100, close: 102, volume: 12000 },
      ]
    } catch {
      return [
        { time: new Date(Date.now() - 3600_000).toISOString(), open: 100, high: 102, low: 99, close: 101, volume: 10000 },
        { time: new Date().toISOString(), open: 101, high: 103, low: 100, close: 102, volume: 12000 },
      ]
    }
  }
} 