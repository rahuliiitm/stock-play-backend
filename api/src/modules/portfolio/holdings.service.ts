import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Holding } from '../../entities/Holding.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { QuotesService } from '../stocks/quotes.service'

export interface HoldingSummary {
  id: string
  portfolioId: string
  symbol: string
  exchange: string
  quantity: number
  avgCostCents: number
  currentPriceCents: number
  marketValueCents: number
  pnlCents: number
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
    private readonly quotes: QuotesService,
  ) {}

  async getPortfolioHoldings(portfolioId: string): Promise<HoldingSummary[]> {
    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found')
    }

    const holdings = await this.holdings.find({ where: { portfolio_id: portfolioId } })
    const summaries: HoldingSummary[] = []

    for (const holding of holdings) {
      const quantity = Number(holding.quantity)
      const avgCostCents = holding.avg_cost_cents

      try {
        const quote = await this.quotes.getQuote(holding.symbol)
        const currentPriceCents = quote.priceCents
        const marketValueCents = Math.round(currentPriceCents * quantity)
        const investedCents = Math.round(avgCostCents * quantity)
        const pnlCents = marketValueCents - investedCents
        const pnlPercent = investedCents > 0 ? Number(((pnlCents / investedCents) * 100).toFixed(4)) : 0

        summaries.push({
          id: holding.id,
          portfolioId,
          symbol: holding.symbol,
          exchange: holding.exchange,
          quantity,
          avgCostCents,
          currentPriceCents,
          marketValueCents,
          pnlCents,
          pnlPercent,
        })
      } catch (error) {
        this.logger.error(`Failed to get quote for ${holding.symbol}:`, error)
        // Return holding with last known values
        const marketValueCents = holding.current_value_cents
        const investedCents = Math.round(avgCostCents * quantity)
        const pnlCents = marketValueCents - investedCents
        const pnlPercent = investedCents > 0 ? Number(((pnlCents / investedCents) * 100).toFixed(4)) : 0

        summaries.push({
          id: holding.id,
          portfolioId,
          symbol: holding.symbol,
          exchange: holding.exchange,
          quantity,
          avgCostCents,
          currentPriceCents: holding.current_value_cents,
          marketValueCents,
          pnlCents,
          pnlPercent,
        })
      }
    }

    return summaries
  }

  async getHolding(portfolioId: string, symbol: string): Promise<HoldingSummary | null> {
    const holding = await this.holdings.findOne({ where: { portfolio_id: portfolioId, symbol } })
    if (!holding) return null

    const quantity = Number(holding.quantity)
    const avgCostCents = holding.avg_cost_cents

    try {
      const quote = await this.quotes.getQuote(symbol)
      const currentPriceCents = quote.priceCents
      const marketValueCents = Math.round(currentPriceCents * quantity)
      const investedCents = Math.round(avgCostCents * quantity)
      const pnlCents = marketValueCents - investedCents
      const pnlPercent = investedCents > 0 ? Number(((pnlCents / investedCents) * 100).toFixed(4)) : 0

      return {
        id: holding.id,
        portfolioId,
        symbol: holding.symbol,
        exchange: holding.exchange,
        quantity,
        avgCostCents,
        currentPriceCents,
        marketValueCents,
        pnlCents,
        pnlPercent,
      }
    } catch (error) {
      this.logger.error(`Failed to get quote for ${symbol}:`, error)
      return null
    }
  }

  async updateHoldingCurrentValue(portfolioId: string, symbol: string, currentValueCents: number): Promise<void> {
    await this.holdings.update(
      { portfolio_id: portfolioId, symbol },
      { current_value_cents: currentValueCents }
    )
  }

  async getAllHoldingsWithSymbols(): Promise<{ portfolioId: string; symbol: string }[]> {
    const holdings = await this.holdings.find({ select: ['portfolio_id', 'symbol'] })
    return holdings.map(h => ({ portfolioId: h.portfolio_id, symbol: h.symbol }))
  }

  async getHoldingsBySymbol(symbol: string): Promise<Holding[]> {
    return this.holdings.find({ where: { symbol } })
  }
}

