import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Holding } from '../../entities/Holding.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { StockQuoteCacheService } from '../stocks/stock-quote-cache.service'

export interface HoldingSummary {
  id: string
  portfolioId: string
  symbol: string
  exchange: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  pnl: number
  pnlPercent: number
}

@Injectable()
export class HoldingsService {
  private readonly logger = new Logger(HoldingsService.name)

  constructor(
    @InjectRepository(Holding)
    private readonly holdings: Repository<Holding>,
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    private readonly quoteCache: StockQuoteCacheService,
  ) {}

  async getPortfolioHoldings(portfolioId: string): Promise<HoldingSummary[]> {
    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found')
    }

    const holdings = await this.holdings.find({ where: { portfolioId: portfolioId } })
    const summaries: HoldingSummary[] = []

    // Get all symbols for this portfolio
    const symbols = holdings.map(h => h.symbol).filter(Boolean)
    
    // Get cached quotes for all symbols at once
    const cachedQuotes = await this.quoteCache.getCachedQuotes(symbols)

    for (const holding of holdings) {
      const quantity = Number(holding.quantity)
      const avgCost = holding.avg_cost

      const cachedQuote = cachedQuotes.get(holding.symbol)
      
      if (cachedQuote) {
        // Use cached quote
              const currentPrice = cachedQuote.price
      const marketValue = Math.round(currentPrice * quantity)
        const invested = Math.round(avgCost * quantity)
        const pnl = marketValue - invested
        const pnlPercent = invested > 0 ? Number(((pnl / invested) * 100).toFixed(4)) : 0

        summaries.push({
          id: holding.id,
          portfolioId,
          symbol: holding.symbol,
          exchange: holding.exchange,
          quantity,
          avgCost,
          currentPrice,
          marketValue,
          pnl,
          pnlPercent,
        })
      } else {
        // Fallback to direct API call
        try {
          const quote = await this.quoteCache.getQuote(holding.symbol)
          if (quote) {
            const currentPrice = quote.price
            const marketValue = Math.round(currentPrice * quantity)
            const invested = Math.round(avgCost * quantity)
            const pnl = marketValue - invested
            const pnlPercent = invested > 0 ? Number(((pnl / invested) * 100).toFixed(4)) : 0

            summaries.push({
              id: holding.id,
              portfolioId,
              symbol: holding.symbol,
              exchange: holding.exchange,
              quantity,
              avgCost,
              currentPrice,
              marketValue,
              pnl,
              pnlPercent,
            })
          } else {
            // Use existing values if quote not available
            const marketValue = holding.current_value
            const invested = Math.round(avgCost * quantity)
            const pnl = marketValue - invested
            const pnlPercent = invested > 0 ? Number(((pnl / invested) * 100).toFixed(4)) : 0

            summaries.push({
              id: holding.id,
              portfolioId,
              symbol: holding.symbol,
              exchange: holding.exchange,
              quantity,
              avgCost,
              currentPrice: holding.current_value,
              marketValue,
              pnl,
              pnlPercent,
            })
          }
        } catch (error) {
          this.logger.error(`Failed to get quote for ${holding.symbol}:`, error)
          // Return holding with last known values
          const marketValue = holding.current_value
          const invested = Math.round(avgCost * quantity)
          const pnl = marketValue - invested
          const pnlPercent = invested > 0 ? Number(((pnl / invested) * 100).toFixed(4)) : 0

          summaries.push({
            id: holding.id,
            portfolioId,
            symbol: holding.symbol,
            exchange: holding.exchange,
            quantity,
            avgCost,
            currentPrice: holding.current_value,
            marketValue,
            pnl,
            pnlPercent,
          })
        }
      }
    }

    return summaries
  }

  async getHolding(portfolioId: string, symbol: string): Promise<HoldingSummary | null> {
    const holding = await this.holdings.findOne({ where: { portfolioId: portfolioId, symbol } })
    if (!holding) return null

    const quantity = Number(holding.quantity)
    const avgCost = holding.avg_cost

    try {
      const quote = await this.quoteCache.getQuote(symbol)
      if (quote) {
        const currentPrice = quote.price
        const marketValue = Math.round(currentPrice * quantity)
        const invested = Math.round(avgCost * quantity)
        const pnl = marketValue - invested
        const pnlPercent = invested > 0 ? Number(((pnl / invested) * 100).toFixed(4)) : 0

        return {
          id: holding.id,
          portfolioId,
          symbol: holding.symbol,
          exchange: holding.exchange,
          quantity,
          avgCost,
          currentPrice,
          marketValue,
          pnl,
          pnlPercent,
        }
      } else {
        return null
      }
    } catch (error) {
      this.logger.error(`Failed to get quote for ${symbol}:`, error)
      return null
    }
  }

  async updateHoldingCurrentValue(portfolioId: string, symbol: string, currentValueCents: number): Promise<void> {
    await this.holdings.update(
      { portfolioId: portfolioId, symbol },
      { current_value: currentValueCents }
    )
  }

  async getAllHoldingsWithSymbols(): Promise<{ portfolioId: string; symbol: string }[]> {
    const holdings = await this.holdings.find({ select: ['portfolioId', 'symbol'] })
    return holdings.map(h => ({ portfolioId: h.portfolioId, symbol: h.symbol }))
  }

  async getHoldingsBySymbol(symbol: string): Promise<Holding[]> {
    return this.holdings.find({ where: { symbol } })
  }

  /**
   * Add holding and notify cache to update quotes for new symbol
   */
  async addHolding(portfolioId: string, symbol: string, quantity: number, avgCostCents: number): Promise<Holding> {
    const holding = this.holdings.create({
      portfolioId: portfolioId,
      symbol,
      quantity: String(quantity),
      avg_cost: avgCostCents,
      current_value: 0,
    })

    const savedHolding = await this.holdings.save(holding)

    // Notify cache to update quotes for this symbol
    await this.quoteCache.updateSymbolsQuotes([symbol])

    this.logger.log(`Added holding ${symbol} to portfolio ${portfolioId}, updated quote cache`)
    return savedHolding
  }

  /**
   * Remove holding and clear cache if symbol is no longer used
   */
  async removeHolding(portfolioId: string, symbol: string): Promise<void> {
    await this.holdings.delete({ portfolioId: portfolioId, symbol })

    // Check if this symbol is still used in any other portfolio
    const remainingHoldings = await this.getHoldingsBySymbol(symbol)
    
    if (remainingHoldings.length === 0) {
      // Symbol is no longer used, clear from cache
      await this.quoteCache.clearSymbolCache(symbol)
      this.logger.log(`Removed holding ${symbol} from portfolio ${portfolioId}, cleared quote cache`)
    } else {
      this.logger.log(`Removed holding ${symbol} from portfolio ${portfolioId}`)
    }
  }

  /**
   * Update holding quantity and notify cache if needed
   */
  async updateHoldingQuantity(portfolioId: string, symbol: string, quantity: number): Promise<void> {
    await this.holdings.update(
      { portfolioId: portfolioId, symbol },
      { quantity: String(quantity) }
    )

    this.logger.log(`Updated holding ${symbol} quantity in portfolio ${portfolioId}`)
  }
}

