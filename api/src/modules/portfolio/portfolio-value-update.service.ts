import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { QuotesService } from '../stocks/quotes.service'
import { ValuationService } from './valuation.service'

@Injectable()
export class PortfolioValueUpdateService {
  private readonly logger = new Logger(PortfolioValueUpdateService.name)

  constructor(
    @InjectRepository(PortfolioV2) private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(Holding) private readonly holdings: Repository<Holding>,
    private readonly quotes: QuotesService,
    private readonly valuation: ValuationService,
  ) {}

  /**
   * Update all portfolio values with current stock prices
   */
  async updateAllPortfolioValues(): Promise<void> {
    this.logger.log('Starting portfolio value update for all portfolios')
    
    const portfolios = await this.portfolios.find({
      relations: ['holdings']
    })

    for (const portfolio of portfolios) {
      try {
        await this.updatePortfolioValue(portfolio.id)
      } catch (error) {
        this.logger.error(`Failed to update portfolio ${portfolio.id}:`, error)
      }
    }

    this.logger.log(`Completed portfolio value update for ${portfolios.length} portfolios`)
  }

  /**
   * Update a specific portfolio's value
   */
  async updatePortfolioValue(portfolioId: string): Promise<void> {
    const portfolio = await this.portfolios.findOne({
      where: { id: portfolioId },
      relations: ['holdings']
    })

    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`)
    }

    let totalValueCents = 0
    const updatedHoldings: Holding[] = []

    // Update each holding with current price
    for (const holding of portfolio.holdings) {
      try {
        const quote = await this.quotes.getQuote(holding.symbol)
        const currentPriceCents = quote.priceCents
        const currentValueCents = Math.round(currentPriceCents * parseFloat(holding.quantity))
        
        holding.current_value_cents = currentValueCents
        updatedHoldings.push(holding)
        totalValueCents += currentValueCents

        this.logger.debug(`Updated holding ${holding.symbol}: ${currentValueCents} cents`)
      } catch (error) {
        this.logger.warn(`Failed to get quote for ${holding.symbol}:`, error)
        // Keep existing value if quote fetch fails
        totalValueCents += holding.current_value_cents || 0
      }
    }

    // Save updated holdings
    if (updatedHoldings.length > 0) {
      await this.holdings.save(updatedHoldings)
    }

    // Calculate return percentage
    const initialValueCents = portfolio.initial_value_cents || 0
    const returnPercent = initialValueCents > 0 ? ((totalValueCents - initialValueCents) / initialValueCents) * 100 : 0

    // Update portfolio with new values
    portfolio.initial_value_cents = initialValueCents
    await this.portfolios.save(portfolio)

    // Invalidate cache
    await this.valuation.invalidatePortfolioCache(portfolioId)

    this.logger.log(`Updated portfolio ${portfolioId}: total value = ${totalValueCents} cents, return = ${returnPercent.toFixed(2)}%`)
  }

  /**
   * Update portfolio values for public portfolios only
   */
  async updatePublicPortfolioValues(): Promise<void> {
    this.logger.log('Starting portfolio value update for public portfolios')
    
    const publicPortfolios = await this.portfolios.find({
      where: { visibility: 'public' },
      relations: ['holdings']
    })

    for (const portfolio of publicPortfolios) {
      try {
        await this.updatePortfolioValue(portfolio.id)
      } catch (error) {
        this.logger.error(`Failed to update public portfolio ${portfolio.id}:`, error)
      }
    }

    this.logger.log(`Completed portfolio value update for ${publicPortfolios.length} public portfolios`)
  }

  /**
   * Update portfolio values for a specific user
   */
  async updateUserPortfolioValues(userId: string): Promise<void> {
    this.logger.log(`Starting portfolio value update for user ${userId}`)
    
    const userPortfolios = await this.portfolios.find({
      where: { user_id: userId },
      relations: ['holdings']
    })

    for (const portfolio of userPortfolios) {
      try {
        await this.updatePortfolioValue(portfolio.id)
      } catch (error) {
        this.logger.error(`Failed to update user portfolio ${portfolio.id}:`, error)
      }
    }

    this.logger.log(`Completed portfolio value update for ${userPortfolios.length} portfolios of user ${userId}`)
  }
}
