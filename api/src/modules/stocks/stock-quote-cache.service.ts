import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Holding } from '../../entities/Holding.entity'
import { getRedis } from '../../lib/redis'
import { GrowwAPI, Exchange, Segment } from 'growwapi'

interface CachedQuote {
  symbol: string
  price: number
  asOf: string
  source: string
  open?: number
  high?: number
  low?: number
  prevClose?: number
}

@Injectable()
export class StockQuoteCacheService {
  private readonly logger = new Logger(StockQuoteCacheService.name)
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly RATE_LIMIT = 300 // requests per minute
  private readonly BATCH_SIZE = 50 // process in batches
  private requestCount = 0
  private lastResetTime = Date.now()

  private readonly groww: GrowwAPI

  constructor(
    @InjectRepository(Holding) private readonly holdings: Repository<Holding>,
  ) {
    this.groww = new GrowwAPI()
  }

  /**
   * Get all unique symbols from all portfolios
   */
  async getUniqueSymbols(): Promise<string[]> {
    const holdings = await this.holdings
      .createQueryBuilder('holding')
      .select('DISTINCT holding.symbol', 'symbol')
      .where('holding.symbol IS NOT NULL')
      .andWhere('holding.symbol != \'\'')
      .getRawMany()

    return holdings.map(h => h.symbol).filter(Boolean)
  }

  /**
   * Get all active symbols from stock universe (for complete coverage)
   */
  async getAllActiveSymbols(): Promise<string[]> {
    const symbols = await this.holdings
      .createQueryBuilder('holding')
      .select('DISTINCT holding.symbol', 'symbol')
      .where('holding.symbol IS NOT NULL')
      .andWhere('holding.symbol != \'\'')
      .getRawMany()

    return symbols.map(h => h.symbol).filter(Boolean)
  }

  /**
   * Check if we can make an API request (rate limiting)
   */
  private canMakeRequest(): boolean {
    const now = Date.now()
    const oneMinute = 60 * 1000

    // Reset counter if a minute has passed
    if (now - this.lastResetTime >= oneMinute) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    return this.requestCount < this.RATE_LIMIT
  }

  /**
   * Increment request counter
   */
  private incrementRequestCount(): void {
    this.requestCount++
  }

  /**
   * Get quote from cache or fetch from API
   */
  async getQuote(symbol: string): Promise<CachedQuote | null> {
    const redis = getRedis()
    const cacheKey = `quote:${symbol}`
    
    try {
      // Try to get from cache first
      if (redis) {
        const cached = await redis.get(cacheKey)
        if (cached) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to get cached quote for ${symbol}:`, error)
    }

    // Not in cache, fetch from API (with rate limiting)
    if (!this.canMakeRequest()) {
      this.logger.warn(`Rate limit reached, cannot fetch quote for ${symbol}`)
      return null
    }

    try {
      this.incrementRequestCount()
      
      // Use growwapi to get quote
      const quoteResponse = await this.groww.liveData.getQuote({
        tradingSymbol: symbol,
        exchange: Exchange.NSE,
        segment: Segment.CASH
      })
      
      const quote: CachedQuote = {
        symbol,
        price: quoteResponse.lastPrice,
        asOf: new Date().toISOString(),
        source: 'groww',
        open: quoteResponse.ohlc?.open,
        high: quoteResponse.ohlc?.high,
        low: quoteResponse.ohlc?.low,
        prevClose: quoteResponse.ohlc?.close
      }
      
      // Cache the quote
      if (redis) {
        await redis.setex(cacheKey, this.CACHE_TTL / 1000, JSON.stringify(quote))
      }
      
      return quote
    } catch (error) {
      this.logger.error(`Failed to fetch quote for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Update quotes for all unique symbols (rate limited)
   */
  async updateAllQuotes(): Promise<void> {
    this.logger.log('Starting quote cache update for all unique symbols')
    
    const symbols = await this.getUniqueSymbols()
    this.logger.log(`Found ${symbols.length} unique symbols to update`)

    if (symbols.length === 0) {
      this.logger.log('No symbols to update')
      return
    }

    // Process in batches to respect rate limits
    const batches = this.chunkArray(symbols, this.BATCH_SIZE)
    let updatedCount = 0
    let skippedCount = 0

    for (const batch of batches) {
      // Check rate limit before processing batch
      if (!this.canMakeRequest()) {
        this.logger.warn(`Rate limit reached, skipping remaining ${symbols.length - updatedCount} symbols`)
        skippedCount = symbols.length - updatedCount
        break
      }

      // Process batch
      for (const symbol of batch) {
        if (!this.canMakeRequest()) {
          skippedCount++
          continue
        }

        try {
          this.incrementRequestCount()
          
          // Use growwapi to get quote
          const quoteResponse = await this.groww.liveData.getQuote({
            tradingSymbol: symbol,
            exchange: Exchange.NSE,
            segment: Segment.CASH
          })
          
          const quote: CachedQuote = {
            symbol,
            price: quoteResponse.lastPrice,
            asOf: new Date().toISOString(),
            source: 'groww',
            open: quoteResponse.ohlc?.open,
            high: quoteResponse.ohlc?.high,
            low: quoteResponse.ohlc?.low,
            prevClose: quoteResponse.ohlc?.close
          }
          
          // Cache the quote
          const redis = getRedis()
          if (redis) {
            const cacheKey = `quote:${symbol}`
            await redis.setex(cacheKey, this.CACHE_TTL / 1000, JSON.stringify(quote))
          }
          
          updatedCount++
          this.logger.debug(`Updated quote for ${symbol}: ₹${quote.price}`)
        } catch (error) {
          this.logger.error(`Failed to update quote for ${symbol}:`, error)
        }
      }

      // Small delay between batches to be respectful
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.sleep(1000) // 1 second delay
      }
    }

    this.logger.log(`Quote cache update completed: ${updatedCount} updated, ${skippedCount} skipped`)
  }

  /**
   * Update quotes for specific symbols
   */
  async updateSymbolsQuotes(symbols: string[]): Promise<void> {
    this.logger.log(`Updating quotes for ${symbols.length} specific symbols`)
    
    let updatedCount = 0
    let skippedCount = 0

    for (const symbol of symbols) {
      if (!this.canMakeRequest()) {
        this.logger.warn(`Rate limit reached, skipping remaining symbols`)
        skippedCount = symbols.length - updatedCount
        break
      }

            try {
        this.incrementRequestCount()
        
        // Use growwapi to get quote
        const quoteResponse = await this.groww.liveData.getQuote({
          tradingSymbol: symbol,
          exchange: Exchange.NSE,
          segment: Segment.CASH
        })
        
        const quote: CachedQuote = {
          symbol,
          price: quoteResponse.lastPrice,
          asOf: new Date().toISOString(),
          source: 'groww',
          open: quoteResponse.ohlc?.open,
          high: quoteResponse.ohlc?.high,
          low: quoteResponse.ohlc?.low,
          prevClose: quoteResponse.ohlc?.close
        }
        
        // Cache the quote
        const redis = getRedis()
        if (redis) {
          const cacheKey = `quote:${symbol}`
          await redis.setex(cacheKey, this.CACHE_TTL / 1000, JSON.stringify(quote))
        }
        
        updatedCount++
        this.logger.debug(`Updated quote for ${symbol}: ₹${quote.price}`)
      } catch (error) {
        this.logger.error(`Failed to update quote for ${symbol}:`, error)
      }
    }

    this.logger.log(`Symbol quotes update completed: ${updatedCount} updated, ${skippedCount} skipped`)
  }

  /**
   * Get all cached quotes for symbols
   */
  async getCachedQuotes(symbols: string[]): Promise<Map<string, CachedQuote>> {
    const redis = getRedis()
    if (!redis) {
      return new Map()
    }

    const quotes = new Map<string, CachedQuote>()
    
    for (const symbol of symbols) {
      try {
        const cacheKey = `quote:${symbol}`
        const cached = await redis.get(cacheKey)
        if (cached) {
          quotes.set(symbol, JSON.parse(cached))
        }
      } catch (error) {
        this.logger.warn(`Failed to get cached quote for ${symbol}:`, error)
      }
    }

    return quotes
  }

  /**
   * Clear cache for specific symbol
   */
  async clearSymbolCache(symbol: string): Promise<void> {
    const redis = getRedis()
    if (redis) {
      const cacheKey = `quote:${symbol}`
      await redis.del(cacheKey)
      this.logger.debug(`Cleared cache for symbol: ${symbol}`)
    }
  }

  /**
   * Clear entire quote cache
   */
  async clearAllCache(): Promise<void> {
    const redis = getRedis()
    if (redis) {
      const keys = await redis.keys('quote:*')
      if (keys.length > 0) {
        await redis.del(...keys)
        this.logger.log(`Cleared ${keys.length} cached quotes`)
      }
    }
  }

  /**
   * Event listener for quote updates (replaces 5-minute scheduler)
   */
  async onQuoteUpdateRequest(): Promise<void> {
    this.logger.log('Received quote update request via event')
    await this.updateAllQuotes()
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Utility function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
