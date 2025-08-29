import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { LeaderboardEntry } from '../../entities/LeaderboardEntry.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity'

export type LeaderboardWindow = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL'

export interface LeaderboardResult {
  rank: number
  portfolioId: string
  portfolioName: string
  userId: string
  returnPercent: number
  marketValueCents: number
  pnlCents: number
  visibility: string
}

export interface LeaderboardFilters {
  window: LeaderboardWindow
  limit?: number
  offset?: number
  minReturnPercent?: number
  includePrivate?: boolean
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name)

  constructor(
    @InjectRepository(LeaderboardEntry)
    private readonly leaderboardEntries: Repository<LeaderboardEntry>,
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(PortfolioSnapshotV2)
    private readonly snapshots: Repository<PortfolioSnapshotV2>,
    private readonly dataSource: DataSource,
  ) {}

  async refreshLeaderboard(window: LeaderboardWindow): Promise<{ processed: number; errors: number }> {
    this.logger.log(`Starting leaderboard refresh for ${window} window`)

    let processed = 0
    let errors = 0

    try {
      const portfolioResults = await this.calculatePortfolioRanks(window)

      // Clear existing entries for this window
      await this.leaderboardEntries.delete({ window })

      // Insert new entries
      const entries = portfolioResults.map(result => ({
        portfolio_id: result.portfolioId,
        window,
        rank: result.rank,
        return_percent: result.returnPercent,
      }))

      if (entries.length > 0) {
        await this.leaderboardEntries.save(
          entries.map(entry => this.leaderboardEntries.create(entry))
        )
        processed = entries.length
      }

      this.logger.log(`Leaderboard refresh completed for ${window}: ${processed} entries`)
    } catch (error) {
      this.logger.error(`Error refreshing leaderboard for ${window}:`, error)
      errors++
    }

    return { processed, errors }
  }

  async calculatePortfolioRanks(window: LeaderboardWindow): Promise<LeaderboardResult[]> {
    const dateRange = this.getDateRangeForWindow(window)
    const startDate = dateRange.start
    const endDate = dateRange.end

    // Get portfolio snapshots within the date range
    const snapshots = await this.snapshots
      .createQueryBuilder('snapshot')
      .leftJoin('snapshot.portfolio', 'portfolio')
      .leftJoin('portfolio.user', 'user')
      .where('snapshot.date >= :startDate', { startDate })
      .andWhere('snapshot.date <= :endDate', { endDate })
      .andWhere('portfolio.visibility != :private', { private: 'private' })
      .select([
        'snapshot.portfolio_id as portfolioId',
        'portfolio.name as portfolioName',
        'portfolio.user_id as userId',
        'portfolio.visibility as visibility',
        'SUM(snapshot.pnl) as totalPnlCents',
        'SUM(snapshot.market_value) as totalMarketValueCents',
        'AVG(snapshot.return_percent) as avgReturnPercent',
        'COUNT(snapshot.id) as snapshotCount',
      ])
      .groupBy('snapshot.portfolio_id, portfolio.name, portfolio.user_id, portfolio.visibility')
      .having('COUNT(snapshot.id) >= :minSnapshots', { minSnapshots: Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) })
      .orderBy('AVG(snapshot.return_percent)', 'DESC')
      .getRawMany()

    const results: LeaderboardResult[] = snapshots.map((snapshot, index) => ({
      rank: index + 1,
      portfolioId: snapshot.portfolioId,
      portfolioName: snapshot.portfolioName,
      userId: snapshot.userId,
      returnPercent: Number(snapshot.avgReturnPercent),
      marketValueCents: Number(snapshot.totalMarketValueCents),
      pnlCents: Number(snapshot.totalPnlCents),
      visibility: snapshot.visibility,
    }))

    return results
  }

  async getLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardResult[]> {
    const { window, limit = 50, offset = 0, minReturnPercent, includePrivate = false } = filters

    const query = this.leaderboardEntries
      .createQueryBuilder('entry')
      .leftJoin('entry.portfolio', 'portfolio')
      .leftJoin('portfolio.user', 'user')
      .leftJoin(
        subQuery => {
          return subQuery
            .select('portfolio_id', 'portfolio_id')
            .addSelect('AVG(return_percent)', 'avgReturn')
            .addSelect('SUM(market_value)', 'totalValue')
            .addSelect('SUM(pnl)', 'totalPnl')
            .from('portfolio_snapshots_v2', 'snapshot')
            .where('snapshot.date >= :startDate')
            .andWhere('snapshot.date <= :endDate')
            .groupBy('portfolio_id')
        },
        'metrics',
        'entry.portfolio_id = metrics.portfolio_id'
      )
      .where('entry.window = :window', { window })

    if (!includePrivate) {
      query.andWhere('portfolio.visibility != :private', { private: 'private' })
    }

    if (minReturnPercent !== undefined) {
      query.andWhere('entry.return_percent >= :minReturnPercent', { minReturnPercent })
    }

    const entries = await query
      .select([
        'entry.rank as rank',
        'entry.portfolio_id as portfolioId',
        'portfolio.name as portfolioName',
        'portfolio.user_id as userId',
        'portfolio.visibility as visibility',
        'entry.return_percent as returnPercent',
        'COALESCE(metrics.totalValue, 0) as marketValueCents',
        'COALESCE(metrics.totalPnl, 0) as pnlCents',
      ])
      .setParameters({
        startDate: this.getDateRangeForWindow(window).start,
        endDate: this.getDateRangeForWindow(window).end,
      })
      .orderBy('entry.rank', 'ASC')
      .limit(limit)
      .offset(offset)
      .getRawMany()

    return entries.map(entry => ({
      rank: Number(entry.rank),
      portfolioId: entry.portfolioId,
      portfolioName: entry.portfolioName,
      userId: entry.userId,
      returnPercent: Number(entry.returnPercent),
      marketValueCents: Number(entry.marketValueCents),
      pnlCents: Number(entry.pnlCents),
      visibility: entry.visibility,
    }))
  }

  async getPortfolioRank(portfolioId: string, window: LeaderboardWindow): Promise<{
    rank: number | null
    totalEntries: number
    percentile: number | null
    returnPercent: number
  } | null> {
    const entry = await this.leaderboardEntries.findOne({
      where: { portfolio_id: portfolioId, window },
    })

    if (!entry) {
      return null
    }

    const totalEntries = await this.leaderboardEntries.count({ where: { window } })
    const percentile = totalEntries > 0 ? ((totalEntries - entry.rank + 1) / totalEntries) * 100 : null

    return {
      rank: entry.rank,
      totalEntries,
      percentile,
      returnPercent: entry.return_percent,
    }
  }

  async getPortfolioPerformanceHistory(portfolioId: string, window: LeaderboardWindow): Promise<Array<{
    date: Date
    rank: number
    returnPercent: number
    marketValueCents: number
  }>> {
    const dateRange = this.getDateRangeForWindow(window)

    const entries = await this.leaderboardEntries
      .createQueryBuilder('entry')
      .leftJoin(
        'portfolio_snapshots_v2',
        'snapshot',
        'entry.portfolio_id = snapshot.portfolio_id AND snapshot.date >= :startDate AND snapshot.date <= :endDate'
      )
      .where('entry.portfolio_id = :portfolioId', { portfolioId })
      .andWhere('entry.window = :window', { window })
      .select([
        'snapshot.date as date',
        'entry.rank as rank',
        'snapshot.return_percent as returnPercent',
        'snapshot.market_value as marketValueCents',
      ])
      .setParameters({
        portfolioId,
        window,
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
      .orderBy('snapshot.date', 'ASC')
      .getRawMany()

    return entries.map(entry => ({
      date: new Date(entry.date),
      rank: Number(entry.rank),
      returnPercent: Number(entry.returnPercent),
      marketValueCents: Number(entry.marketValueCents),
    }))
  }

  private getDateRangeForWindow(window: LeaderboardWindow): { start: Date; end: Date } {
    const now = new Date()
    const end = new Date(now)

    switch (window) {
      case 'DAILY':
        const start = new Date(now)
        start.setDate(now.getDate() - 1)
        return { start, end }

      case 'WEEKLY':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 7)
        return { start: weekStart, end }

      case 'MONTHLY':
        const monthStart = new Date(now)
        monthStart.setMonth(now.getMonth() - 1)
        return { start: monthStart, end }

      case 'ALL':
        const allStart = new Date('2020-01-01') // Start from when portfolios were introduced
        return { start: allStart, end }

      default:
        throw new Error(`Unknown window type: ${window}`)
    }
  }

  async getLeaderboardStats(window: LeaderboardWindow): Promise<{
    totalPortfolios: number
    lastUpdated: Date | null
    topPerformers: Array<{
      portfolioId: string
      portfolioName: string
      returnPercent: number
      rank: number
    }>
  }> {
    const totalPortfolios = await this.leaderboardEntries.count({ where: { window } })

    const lastUpdated = await this.leaderboardEntries
      .createQueryBuilder('entry')
      .select('MAX(entry.updated_at)', 'lastUpdated')
      .where('entry.window = :window', { window })
      .getRawOne()

    const topPerformers = await this.getLeaderboard({
      window,
      limit: 10,
      includePrivate: false,
    })

    return {
      totalPortfolios,
      lastUpdated: lastUpdated?.lastUpdated ? new Date(lastUpdated.lastUpdated) : null,
      topPerformers: topPerformers.slice(0, 5).map(p => ({
        portfolioId: p.portfolioId,
        portfolioName: p.portfolioName,
        returnPercent: p.returnPercent,
        rank: p.rank,
      })),
    }
  }

  async refreshAllLeaderboards(): Promise<{ daily: any; weekly: any; monthly: any }> {
    this.logger.log('Starting refresh of all leaderboards')

    const [daily, weekly, monthly] = await Promise.all([
      this.refreshLeaderboard('DAILY'),
      this.refreshLeaderboard('WEEKLY'),
      this.refreshLeaderboard('MONTHLY'),
    ])

    this.logger.log('All leaderboards refreshed successfully')

    return { daily, weekly, monthly }
  }
}

