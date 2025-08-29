import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StockSymbol } from '../../entities/StockSymbol.entity'

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: 'NSE' | 'BSE'
  isin?: string
  series?: string
}

@Injectable()
export class StockUniverseService {
  private readonly logger = new Logger(StockUniverseService.name)

  constructor(
    @InjectRepository(StockSymbol) private readonly symbols: Repository<StockSymbol>,
  ) {}

  /**
   * Search stocks for autocomplete
   */
  async searchStocks(query: string, limit: number = 20): Promise<StockSearchResult[]> {
    const searchTerm = query.toUpperCase().trim()
    
    if (searchTerm.length < 2) {
      return []
    }

    const results = await this.symbols
      .createQueryBuilder('symbol')
      .select([
        'symbol.symbol',
        'symbol.name', 
        'symbol.exchange',
        'symbol.isin',
        'symbol.series'
      ])
      .where('symbol.status = :status', { status: 'active' })
      .andWhere('(symbol.symbol LIKE :search OR symbol.name LIKE :search OR symbol.isin LIKE :search)', {
        search: `%${searchTerm}%`
      })
      .orderBy('symbol.symbol', 'ASC')
      .limit(limit)
      .getMany()

    return results.map(s => ({
      symbol: s.symbol,
      name: s.name || s.symbol,
      exchange: s.exchange as 'NSE' | 'BSE',
      isin: s.isin || undefined,
      series: s.series || undefined
    }))
  }

  /**
   * Get all active symbols for a specific exchange
   */
  async getActiveSymbols(exchange?: 'NSE' | 'BSE'): Promise<StockSearchResult[]> {
    const query = this.symbols
      .createQueryBuilder('symbol')
      .select([
        'symbol.symbol',
        'symbol.name',
        'symbol.exchange', 
        'symbol.isin',
        'symbol.series'
      ])
      .where('symbol.status = :status', { status: 'active' })
      .orderBy('symbol.symbol', 'ASC')

    if (exchange) {
      query.andWhere('symbol.exchange = :exchange', { exchange })
    }

    const results = await query.getMany()

    return results.map(s => ({
      symbol: s.symbol,
      name: s.name || s.symbol,
      exchange: s.exchange as 'NSE' | 'BSE',
      isin: s.isin || undefined,
      series: s.series || undefined
    }))
  }

  /**
   * Get symbol details by symbol and exchange
   */
  async getSymbolDetails(symbol: string, exchange: 'NSE' | 'BSE'): Promise<StockSearchResult | null> {
    const result = await this.symbols.findOne({
      where: { symbol: symbol.toUpperCase(), exchange, status: 'active' }
    })

    if (!result) return null

    return {
      symbol: result.symbol,
      name: result.name || result.symbol,
      exchange: result.exchange as 'NSE' | 'BSE',
      isin: result.isin || undefined,
      series: result.series || undefined
    }
  }

  /**
   * Get symbol details by ISIN
   */
  async getSymbolByIsin(isin: string): Promise<StockSearchResult | null> {
    const result = await this.symbols.findOne({
      where: { isin: isin.toUpperCase(), status: 'active' }
    })

    if (!result) return null

    return {
      symbol: result.symbol,
      name: result.name || result.symbol,
      exchange: result.exchange as 'NSE' | 'BSE',
      isin: result.isin || undefined,
      series: result.series || undefined
    }
  }

  /**
   * Get total count of active symbols
   */
  async getActiveSymbolCount(): Promise<{ nse: number; bse: number; total: number }> {
    const [nseCount, bseCount] = await Promise.all([
      this.symbols.count({ where: { exchange: 'NSE', status: 'active' } }),
      this.symbols.count({ where: { exchange: 'BSE', status: 'active' } })
    ])

    return {
      nse: nseCount,
      bse: bseCount,
      total: nseCount + bseCount
    }
  }

  /**
   * Get popular symbols (most frequently searched/used)
   */
  async getPopularSymbols(limit: number = 50): Promise<StockSearchResult[]> {
    // This could be enhanced with actual usage analytics
    // For now, return a curated list of popular stocks
    const popularSymbols = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
      'AXISBANK', 'ASIANPAINT', 'MARUTI', 'HCLTECH', 'SUNPHARMA'
    ]

    const results = await this.symbols
      .createQueryBuilder('symbol')
      .select([
        'symbol.symbol',
        'symbol.name',
        'symbol.exchange',
        'symbol.isin',
        'symbol.series'
      ])
      .where('symbol.status = :status', { status: 'active' })
      .andWhere('symbol.symbol IN (:...symbols)', { symbols: popularSymbols })
      .orderBy('symbol.symbol', 'ASC')
      .limit(limit)
      .getMany()

    return results.map(s => ({
      symbol: s.symbol,
      name: s.name || s.symbol,
      exchange: s.exchange as 'NSE' | 'BSE',
      isin: s.isin || undefined,
      series: s.series || undefined
    }))
  }
}
