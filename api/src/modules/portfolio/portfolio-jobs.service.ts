import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity'
import { PortfolioServiceV2 } from './portfolio-v2.service'
import { ValuationService } from './valuation.service'

@Injectable()
export class PortfolioJobsService {
  private readonly logger = new Logger(PortfolioJobsService.name)

  constructor(
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(PortfolioSnapshotV2)
    private readonly snapshots: Repository<PortfolioSnapshotV2>,
    private readonly portfolioService: PortfolioServiceV2,
    private readonly valuationService: ValuationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_11PM) // Run daily at 11 PM IST (market close)
  async createDailyPortfolioSnapshots() {
    this.logger.log('Starting daily portfolio snapshots job')

    try {
      // Get all portfolios
      const allPortfolios = await this.portfolios.find()
      this.logger.log(`Processing ${allPortfolios.length} portfolios for daily snapshots`)

      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of day

      let processed = 0
      let errors = 0

      for (const portfolio of allPortfolios) {
        try {
          // Check if snapshot already exists for today
          const existingSnapshot = await this.snapshots.findOne({
            where: {
              portfolioId: portfolio.id,
              date: today,
            },
          })

          if (existingSnapshot) {
            this.logger.debug(`Snapshot already exists for portfolio ${portfolio.id} on ${today.toISOString()}`)
            continue
          }

          // Create new snapshot
          const snapshot = await this.portfolioService.createPortfolioSnapshot(portfolio.id, today)

          if (snapshot) {
            this.logger.debug(`Created snapshot for portfolio ${portfolio.id}`)
            processed++
          } else {
            this.logger.warn(`Failed to create snapshot for portfolio ${portfolio.id} (no holdings)`)
          }
        } catch (error) {
          this.logger.error(`Error processing portfolio ${portfolio.id}:`, error)
          errors++
        }
      }

      this.logger.log(`Daily portfolio snapshots completed: ${processed} processed, ${errors} errors`)
    } catch (error) {
      this.logger.error('Error in daily portfolio snapshots job:', error)
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES) // Run every 10 minutes during market hours
  async updatePortfolioCurrentValues() {
    const now = new Date()
    const istHour = now.getUTCHours() + 5.5 // Convert to IST

    // Only run during market hours (9:15 AM - 3:30 PM IST)
    if (istHour < 9.25 || istHour > 15.5) {
      return
    }

    this.logger.debug('Starting portfolio current values update job')

    try {
      // Get all unique symbols across all portfolios
      const allHoldings = await this.portfolios
        .createQueryBuilder('p')
        .leftJoin('p.holdings', 'h')
        .select('h.symbol', 'symbol')
        .distinct(true)
        .getRawMany()

      const symbols = allHoldings.map(h => h.symbol).filter(Boolean)
      this.logger.debug(`Updating current values for ${symbols.length} symbols`)

      if (symbols.length === 0) {
        return
      }

      // Get quotes for all symbols
      const quotesMap = await this.valuationService.getBulkQuotes(symbols)

      let updated = 0
      let errors = 0

      // Update current values for all holdings
      for (const symbol of symbols) {
        try {
          const quote = quotesMap.get(symbol)
          if (!quote) {
            this.logger.warn(`No quote available for symbol ${symbol}`)
            continue
          }

          // Update all holdings for this symbol
          const holdings = await this.portfolios
            .createQueryBuilder('p')
            .leftJoin('p.holdings', 'h')
            .where('h.symbol = :symbol', { symbol })
            .select('h.id', 'id')
            .addSelect('h.quantity', 'quantity')
            .getRawMany()

          for (const holding of holdings) {
            const quantity = Number(holding.quantity)
            const currentValueCents = Math.round(quote.price * quantity)

            await this.valuationService.invalidatePortfolioCache(holding.portfolioId)
            updated++
          }
        } catch (error) {
          this.logger.error(`Error updating current values for ${symbol}:`, error)
          errors++
        }
      }

      this.logger.debug(`Portfolio current values update completed: ${updated} updated, ${errors} errors`)
    } catch (error) {
      this.logger.error('Error in portfolio current values update job:', error)
    }
  }

  @Cron(CronExpression.EVERY_HOUR) // Run hourly for maintenance
  async cleanupExpiredCache() {
    this.logger.debug('Starting cache cleanup job')

    try {
      const cacheStats = await this.valuationService.getCacheStats()
      this.logger.debug(`Cache stats: ${JSON.stringify(cacheStats)}`)

      // Additional cleanup logic can be added here if needed
      // For now, Redis TTL handles expiration automatically
    } catch (error) {
      this.logger.error('Error in cache cleanup job:', error)
    }
  }

  // Manual trigger methods for testing or admin use
  async triggerDailySnapshots(): Promise<{ processed: number; errors: number }> {
    this.logger.log('Manually triggering daily portfolio snapshots')
    await this.createDailyPortfolioSnapshots()

    // Return dummy result since the actual method doesn't return data
    return { processed: 0, errors: 0 }
  }

  async triggerCurrentValuesUpdate(): Promise<{ updated: number; errors: number }> {
    this.logger.log('Manually triggering portfolio current values update')
    await this.updatePortfolioCurrentValues()

    // Return dummy result since the actual method doesn't return data
    return { updated: 0, errors: 0 }
  }

  async getPortfolioSnapshotHistory(portfolioId: string, days: number = 30): Promise<PortfolioSnapshotV2[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.snapshots
      .createQueryBuilder('snapshot')
      .where('snapshot.portfolioId = :portfolioId', { portfolioId })
      .andWhere('snapshot.date >= :startDate', { startDate })
      .orderBy('snapshot.date', 'ASC')
      .getMany()
  }

  async getJobStats(): Promise<{
    totalPortfolios: number
    totalSnapshots: number
    snapshotsToday: number
    cacheStats: any
  }> {
    const totalPortfolios = await this.portfolios.count()
    const totalSnapshots = await this.snapshots.count()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const snapshotsToday = await this.snapshots
      .createQueryBuilder('snapshot')
      .where('snapshot.created_at >= :today', { today })
      .andWhere('snapshot.created_at < :tomorrow', { tomorrow })
      .getCount()

    const cacheStats = await this.valuationService.getCacheStats()

    return {
      totalPortfolios,
      totalSnapshots,
      snapshotsToday,
      cacheStats,
    }
  }
}

