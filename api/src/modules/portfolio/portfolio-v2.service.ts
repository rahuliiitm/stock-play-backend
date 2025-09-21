import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { PortfolioTransactionV2 } from '../../entities/PortfolioTransactionV2.entity'
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity'
import { QuotesService } from '../stocks/quotes.service'
import { ValuationService } from './valuation.service'
import { PortfolioEventsService } from './events/portfolio-events.service'

export interface PortfolioMetrics {
  marketValueCents: number
  investedCents: number
  pnlCents: number
  returnPercent: number
  holdings: Array<{
    symbol: string
    quantity: number
    avgCostCents: number
    currentPriceCents: number
    marketValueCents: number
    pnlCents: number
    exchange: string
  }>
}

export interface PortfolioSummary {
  id: string
  name: string
  visibility: string
  createdAt: Date
  metrics: PortfolioMetrics | null
}

@Injectable()
export class PortfolioServiceV2 {
  private readonly logger = new Logger(PortfolioServiceV2.name)

  constructor(
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(Holding)
    private readonly holdings: Repository<Holding>,
    @InjectRepository(PortfolioTransactionV2)
    private readonly transactions: Repository<PortfolioTransactionV2>,
    @InjectRepository(PortfolioSnapshotV2)
    private readonly snapshots: Repository<PortfolioSnapshotV2>,
    private readonly dataSource: DataSource,
    private readonly quotes: QuotesService,
    private readonly valuationService: ValuationService,
    private readonly eventsService: PortfolioEventsService,
  ) {}

  async createPortfolio(userId: string, name: string, visibility: 'public' | 'unlisted' | 'private' = 'private'): Promise<PortfolioV2> {
    const existing = await this.portfolios.findOne({ where: { user_id: userId, name } })
    if (existing) {
      throw new Error('Portfolio with this name already exists')
    }

    const portfolio = this.portfolios.create({
      user_id: userId,
      name,
      visibility,
    })

    const savedPortfolio = await this.portfolios.save(portfolio)

    // Emit portfolio created event
    await this.eventsService.emitPortfolioCreated({
      userId,
      portfolioId: savedPortfolio.id,
      portfolioName: savedPortfolio.name,
      visibility: savedPortfolio.visibility,
    })

    return savedPortfolio
  }

  async getUserPortfolios(userId: string): Promise<PortfolioSummary[]> {
    const portfolios = await this.portfolios.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    })

    const summaries: PortfolioSummary[] = []
    for (const portfolio of portfolios) {
      const metrics = await this.getPortfolioMetrics(portfolio.id)
      summaries.push({
        id: portfolio.id,
        name: portfolio.name,
        visibility: portfolio.visibility,
        createdAt: portfolio.created_at,
        metrics,
      })
    }

    return summaries
  }

  async getPortfolioMetrics(portfolioId: string): Promise<PortfolioMetrics | null> {
    // Use the ValuationService for cached and optimized pricing
    return this.valuationService.calculatePortfolioValuation(portfolioId)
  }

  async createPortfolioSnapshot(portfolioId: string, date: Date): Promise<PortfolioSnapshotV2 | null> {
    return this.valuationService.createPortfolioSnapshot(portfolioId, date)
  }

  async addStockToPortfolio(portfolioId: string, symbol: string, quantity: number, exchange: 'NSE' | 'BSE' = 'NSE'): Promise<{ ok: boolean; message?: string }> {
    if (quantity <= 0) {
      return { ok: false, message: 'Quantity must be positive' }
    }

    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      return { ok: false, message: 'Portfolio not found' }
    }

    const quote = await this.quotes.getQuote(symbol)
    const price = quote.price
    const totalValue = Math.round(price * quantity)

    // Create transaction
    const transaction = this.transactions.create({
      portfolioId: portfolioId,
      symbol,
      exchange,
      quantity_delta: String(quantity),
      price: price,
      fees: 0, // Can be configured later
      type: 'BUY',
    })

    // Update or create holding
    let holding = await this.holdings.findOne({ where: { portfolioId: portfolioId, symbol } })
    if (holding) {
      const existingQty = Number(holding.quantity)
      const newQty = existingQty + quantity
      const totalInvested = holding.avg_cost * existingQty + totalValue
      holding.avg_cost = Math.round(totalInvested / newQty)
      holding.quantity = String(newQty)
      holding.current_value = Math.round(price * newQty)
      await this.holdings.save(holding)
    } else {
      holding = this.holdings.create({
        portfolioId: portfolioId,
        symbol,
        exchange,
        quantity: String(quantity),
        avg_cost: price,
        current_value: totalValue,
      })
      await this.holdings.save(holding)
    }

    await this.transactions.save(transaction)

    // Invalidate cache after portfolio changes
    await this.valuationService.invalidatePortfolioCache(portfolioId)

    return { ok: true }
  }

  async removeStockFromPortfolio(portfolioId: string, symbol: string, quantity?: number): Promise<{ ok: boolean; message?: string }> {
    const holding = await this.holdings.findOne({ where: { portfolioId: portfolioId, symbol } })
    if (!holding) {
      return { ok: false, message: 'Holding not found' }
    }

    const currentQty = Number(holding.quantity)
    const sellQty = quantity || currentQty

    if (sellQty <= 0 || sellQty > currentQty) {
      return { ok: false, message: 'Invalid quantity' }
    }

    const quote = await this.quotes.getQuote(symbol)
    const price = quote.price
    const proceeds = Math.round(price * sellQty)

    // Create transaction
    const transaction = this.transactions.create({
      portfolioId: portfolioId,
      symbol,
      exchange: holding.exchange,
      quantity_delta: String(-sellQty),
      price: price,
      fees: 0,
      type: 'SELL',
    })

    const remainingQty = currentQty - sellQty
    if (remainingQty === 0) {
      await this.holdings.remove(holding)
    } else {
      holding.quantity = String(remainingQty)
      holding.current_value = Math.round(price * remainingQty)
      await this.holdings.save(holding)
    }

    await this.transactions.save(transaction)

    // Invalidate cache after portfolio changes
    await this.valuationService.invalidatePortfolioCache(portfolioId)

    return { ok: true }
  }

  async deletePortfolio(portfolioId: string): Promise<{ ok: boolean; message?: string }> {
    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      return { ok: false, message: 'Portfolio not found' }
    }

    // Delete all related records
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PortfolioTransactionV2, { portfolioId: portfolioId })
      await manager.delete(Holding, { portfolioId: portfolioId })
      await manager.delete(PortfolioSnapshotV2, { portfolioId: portfolioId })
      await manager.delete(PortfolioV2, { id: portfolioId })
    })

    return { ok: true }
  }
}

