import { Inject, Injectable } from '@nestjs/common'
import { getRedis } from '../../lib/redis'
import { QUOTES_PROVIDER } from './providers'
import type { QuotesProvider } from './providers/provider.interface'

@Injectable()
export class QuotesService {
  private quotesTtlSec = 10
  private candlesTtlSec = 60

  constructor(@Inject(QUOTES_PROVIDER) private readonly provider: QuotesProvider) {}

  async getQuote(symbol: string) {
    const redis = getRedis()
    const key = `quotes:latest:${symbol}`
    if (redis) {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached)
    }
    const data = await this.provider.getQuote(symbol)
    if (redis) await redis.setex(key, this.quotesTtlSec, JSON.stringify(data))
    return data
  }

  async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number) {
    const tf = intervalMinutes ? `${intervalMinutes}m` : 'default'
    const key = `candles:${symbol}:${tf}:${from || 'start'}:${to || 'end'}`
    const redis = getRedis()
    if (redis) {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached)
    }
    const data = await this.provider.getHistory(symbol, from, to, intervalMinutes)
    if (redis) await redis.setex(key, this.candlesTtlSec, JSON.stringify(data))
    return data
  }

  async search(query: string) {
    const q = query.toUpperCase()
    // Placeholder: real provider search here
    return [
      { symbol: q, name: `${q} Corp.` },
      { symbol: `${q}X`, name: `${q} X Ltd.` },
    ]
  }
} 