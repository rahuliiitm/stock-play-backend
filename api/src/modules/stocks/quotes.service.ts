import { Injectable } from '@nestjs/common'
import { getRedis } from '../../lib/redis'
import { StockUniverseService } from './stock-universe.service'
import { GrowwApiService } from '../broker/services/groww-api.service'

@Injectable()
export class QuotesService {
  private quotesTtlSec = 10
  private candlesTtlSec = 60

  constructor(
    private readonly stockUniverse: StockUniverseService,
    private readonly growwApi: GrowwApiService
  ) {}

  async getQuote(symbol: string) {
    const redis = getRedis()
    const key = `quotes:latest:${symbol}`
    if (redis) {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached)
    }
    
    try {
      const data = await this.growwApi.getQuote(symbol)
      const quote = {
        symbol: symbol,
        price: Number(data?.ltp || data?.price || 0),
        asOf: new Date().toISOString(),
        source: 'groww',
        open: data?.ohlc?.open,
        high: data?.ohlc?.high,
        low: data?.ohlc?.low,
        prevClose: data?.ohlc?.close,
      }
      
      if (redis) await redis.setex(key, this.quotesTtlSec, JSON.stringify(quote))
      return quote
    } catch (error) {
      console.error(`Quote error for ${symbol}:`, error)
      throw error
    }
  }

  async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number) {
    const tf = intervalMinutes ? `${intervalMinutes}m` : 'default'
    const key = `candles:${symbol}:${tf}:${from || 'start'}:${to || 'end'}`
    const redis = getRedis()
    if (redis) {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached)
    }
    
    try {
      const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const toDate = to ? new Date(to) : new Date()
      const interval = intervalMinutes && intervalMinutes <= 60 ? '1m' : '1D'

      const candles = await this.growwApi.getHistoricalData(
        symbol,
        fromDate.toISOString(),
        toDate.toISOString(),
        interval,
      )

      const data = (candles || []).map((candle: any) => ({
        time: candle.time || candle.timestamp || candle[0] || new Date().toISOString(),
        open: candle.open || candle[1] || 0,
        high: candle.high || candle[2] || 0,
        low: candle.low || candle[3] || 0,
        close: candle.close || candle[4] || 0,
        volume: candle.volume || candle[5] || 0,
      }))
      
      if (redis) await redis.setex(key, this.candlesTtlSec, JSON.stringify(data))
      return data
    } catch (error) {
      console.error(`History error for ${symbol}:`, error)
      return []
    }
  }

  async search(query: string) {
    // Use real database search instead of mock data
    return await this.stockUniverse.searchStocks(query, 20)
  }
} 