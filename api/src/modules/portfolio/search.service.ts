import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, MoreThan } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { User } from '../../entities/User.entity'
import { LeaderboardService } from './leaderboard.service'
import { PortfolioServiceV2 } from './portfolio-v2.service'

export interface SearchFilters {
  query?: string
  visibility?: 'public' | 'unlisted' | 'private'
  minReturnPercent?: number
  maxReturnPercent?: number
  sortBy?: 'name' | 'createdAt' | 'returnPercent' | 'marketValue'
  sortOrder?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

export interface PortfolioSearchResult {
  id: string
  name: string
  visibility: string
  createdAt: Date
  metrics: any
  user: {
    id: string
    username?: string | null
    displayName?: string | null
  }
  rank?: {
    window: string
    position: number
    returnPercent: number
  }
}

export interface UserSearchResult {
  id: string
  username?: string | null
  displayName?: string | null
  email?: string | null
  portfolioCount: number
  topPortfolio?: {
    id: string
    name: string
    returnPercent: number
  }
  createdAt: Date
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly leaderboardService: LeaderboardService,
    private readonly portfolioService: PortfolioServiceV2,
  ) {}

  async searchPortfolios(filters: SearchFilters): Promise<{
    results: PortfolioSearchResult[]
    total: number
    hasMore: boolean
  }> {
    const {
      query = '',
      visibility = 'public',
      minReturnPercent,
      maxReturnPercent,
      sortBy = 'returnPercent',
      sortOrder = 'DESC',
      limit = 20,
      offset = 0,
    } = filters

    let queryBuilder = this.portfolios
      .createQueryBuilder('portfolio')
      .leftJoin('portfolio.user', 'user')
      .leftJoin(
        subQuery => {
          return subQuery
            .select('portfolio_id', 'portfolio_id')
            .addSelect('AVG(return_percent)', 'avgReturn')
            .from('portfolio_snapshots_v2', 'snapshot')
            .where('snapshot.date >= :startDate')
            .groupBy('portfolio_id')
        },
        'metrics',
        'portfolio.id = metrics.portfolio_id'
      )
      .where('portfolio.visibility = :visibility', { visibility })

    // Add search query if provided
    if (query && query.length > 1) {
      queryBuilder = queryBuilder.andWhere(
        '(portfolio.name ILIKE :query OR user.email ILIKE :query OR user.display_name ILIKE :query)',
        { query: `%${query}%` }
      )
    }

    // Add return percentage filters
    if (minReturnPercent !== undefined) {
      queryBuilder = queryBuilder.andWhere('metrics.avgReturn >= :minReturnPercent', { minReturnPercent })
    }

    if (maxReturnPercent !== undefined) {
      queryBuilder = queryBuilder.andWhere('metrics.avgReturn <= :maxReturnPercent', { maxReturnPercent })
    }

    // Add sorting
    switch (sortBy) {
      case 'name':
        queryBuilder = queryBuilder.orderBy('portfolio.name', sortOrder)
        break
      case 'createdAt':
        queryBuilder = queryBuilder.orderBy('portfolio.created_at', sortOrder)
        break
      case 'returnPercent':
        queryBuilder = queryBuilder.orderBy('metrics.avgReturn', sortOrder)
        break
      case 'marketValue':
        // This would require joining with latest snapshot for market value
        queryBuilder = queryBuilder.orderBy('portfolio.created_at', sortOrder)
        break
      default:
        queryBuilder = queryBuilder.orderBy('metrics.avgReturn', 'DESC')
    }

    // Add pagination
    queryBuilder = queryBuilder.limit(limit + 1).offset(offset)

    const portfolios = await queryBuilder.getMany()
    const hasMore = portfolios.length > limit

    // Remove the extra item if we fetched more than limit
    if (hasMore) {
      portfolios.pop()
    }

    // Get current leaderboard ranks for these portfolios
    const portfolioIds = portfolios.map(p => p.id)
    const leaderboardRanks = await this.getLeaderboardRanksForPortfolios(portfolioIds)

    const results: PortfolioSearchResult[] = portfolios.map(portfolio => {
      const metrics = {
        returnPercent: 0,
        marketValueCents: 0,
        pnlCents: 0,
      }

      // Get rank for this portfolio (default to weekly)
      const rank = leaderboardRanks.get(portfolio.id)?.get('WEEKLY')

      return {
        id: portfolio.id,
        name: portfolio.name,
        visibility: portfolio.visibility,
        createdAt: portfolio.created_at,
        metrics,
        user: {
          id: portfolio.user_id,
          username: portfolio.user?.email,
          displayName: portfolio.user?.display_name,
        },
        rank,
      }
    })

    // Get total count for pagination info
    const totalQuery = this.portfolios
      .createQueryBuilder('portfolio')
      .where('portfolio.visibility = :visibility', { visibility })

    if (query && query.length > 1) {
      totalQuery.andWhere(
        '(portfolio.name ILIKE :query OR portfolio.user_id IN (SELECT id FROM users WHERE username ILIKE :query OR display_name ILIKE :query))',
        { query: `%${query}%` }
      )
    }

    const total = await totalQuery.getCount()

    return {
      results,
      total,
      hasMore,
    }
  }

  async searchUsers(query: string, limit = 20, offset = 0): Promise<{
    results: UserSearchResult[]
    total: number
    hasMore: boolean
  }> {
    if (!query || query.length < 2) {
      return { results: [], total: 0, hasMore: false }
    }

    // Search users by username, display name, or email
    const users = await this.users
      .createQueryBuilder('user')
      .leftJoin('user.portfolios', 'portfolio', 'portfolio.visibility != :private', { private: 'private' })
      .where('user.display_name ILIKE :query OR user.email ILIKE :query', {
        query: `%${query}%`,
      })
      .select([
        'user.id',
        'user.email',
        'user.display_name',
        'user.email',
        'user.created_at',
        'COUNT(portfolio.id) as portfolioCount',
      ])
      .groupBy('user.id, user.email, user.display_name, user.email, user.created_at')
      .orderBy('user.created_at', 'DESC')
      .limit(limit + 1)
      .offset(offset)
      .getRawMany()

    const hasMore = users.length > limit
    if (hasMore) {
      users.pop()
    }

    // Get top performing portfolio for each user
    const userIds = users.map(u => u.user_id)
    const topPortfolios = await this.getTopPortfoliosForUsers(userIds)

    const results: UserSearchResult[] = users.map(user => {
      const topPortfolio = topPortfolios.get(user.user_id)

      return {
        id: user.user_id,
        username: user.user_username,
        displayName: user.user_display_name,
        email: user.user_email,
        portfolioCount: parseInt(user.portfolioCount || '0'),
        topPortfolio,
        createdAt: new Date(user.user_created_at),
      }
    })

    // Get total count
    const total = await this.users
      .createQueryBuilder('user')
      .where('user.display_name ILIKE :query OR user.email ILIKE :query', {
        query: `%${query}%`,
      })
      .getCount()

    return {
      results,
      total,
      hasMore,
    }
  }

  async getPopularPortfolios(limit = 10): Promise<PortfolioSearchResult[]> {
    // Get portfolios with highest weekly returns
    const leaderboard = await this.leaderboardService.getLeaderboard({
      window: 'WEEKLY',
      limit,
      includePrivate: false,
    })

    const portfolioIds = leaderboard.map(l => l.portfolioId)
    const portfolios = await this.portfolios
      .createQueryBuilder('portfolio')
      .leftJoin('portfolio.user', 'user')
      .where('portfolio.id IN (:...portfolioIds)', { portfolioIds })
      .getMany()

    const results: PortfolioSearchResult[] = portfolios.map(portfolio => {
      const leaderboardEntry = leaderboard.find(l => l.portfolioId === portfolio.id)

      return {
        id: portfolio.id,
        name: portfolio.name,
        visibility: portfolio.visibility,
        createdAt: portfolio.created_at,
        metrics: {
          returnPercent: leaderboardEntry?.returnPercent || 0,
          marketValueCents: leaderboardEntry?.marketValueCents || 0,
          pnlCents: leaderboardEntry?.pnlCents || 0,
        },
        user: {
          id: portfolio.user_id,
          username: portfolio.user?.email,
          displayName: portfolio.user?.display_name,
        },
        rank: leaderboardEntry ? {
          window: 'WEEKLY',
          position: leaderboardEntry.rank,
          returnPercent: leaderboardEntry.returnPercent,
        } : undefined,
      }
    })

    return results
  }

  async getPortfolioSuggestions(userId: string, limit = 5): Promise<PortfolioSearchResult[]> {
    // Get user's own portfolios first
    const userPortfolios = await this.portfolioService.getUserPortfolios(userId)
    const userPortfolioResults = userPortfolios.slice(0, limit).map(p => ({
      id: p.id,
      name: p.name,
      visibility: p.visibility,
      createdAt: p.createdAt,
      metrics: p.metrics,
      user: { id: userId },
    }))

    if (userPortfolioResults.length >= limit) {
      return userPortfolioResults
    }

    // Fill remaining slots with popular public portfolios
    const remaining = limit - userPortfolioResults.length
    const popularPortfolios = await this.getPopularPortfolios(remaining * 2)

    // Filter out user's own portfolios and take remaining slots
    const filteredPopular = popularPortfolios
      .filter(p => p.user.id !== userId)
      .slice(0, remaining)

    return [...userPortfolioResults, ...filteredPopular]
  }

  private async getLeaderboardRanksForPortfolios(portfolioIds: string[]): Promise<Map<string, Map<string, any>>> {
    const ranks = new Map<string, Map<string, any>>()

    if (portfolioIds.length === 0) return ranks

    const windows: ('DAILY' | 'WEEKLY' | 'MONTHLY')[] = ['DAILY', 'WEEKLY', 'MONTHLY']

    for (const window of windows) {
      const entries = await this.leaderboardService['leaderboardEntries']
        .createQueryBuilder('entry')
        .where('entry.portfolio_id IN (:...portfolioIds)', { portfolioIds })
        .andWhere('entry.window = :window', { window })
        .getMany()

      for (const entry of entries) {
        if (!ranks.has(entry.portfolio_id)) {
          ranks.set(entry.portfolio_id, new Map())
        }
        ranks.get(entry.portfolio_id)!.set(window, {
          window,
          position: entry.rank,
          returnPercent: entry.return_percent,
        })
      }
    }

    return ranks
  }

  private async getTopPortfoliosForUsers(userIds: string[]): Promise<Map<string, any>> {
    const topPortfolios = new Map<string, any>()

    if (userIds.length === 0) return topPortfolios

    // Get the top performing portfolio for each user
    const portfolios = await this.portfolios
      .createQueryBuilder('portfolio')
      .leftJoin(
        subQuery => {
          return subQuery
            .select('portfolio_id', 'portfolio_id')
            .addSelect('AVG(return_percent)', 'avgReturn')
            .from('portfolio_snapshots_v2', 'snapshot')
            .where('snapshot.date >= :startDate')
            .groupBy('portfolio_id')
        },
        'metrics',
        'portfolio.id = metrics.portfolio_id'
      )
      .where('portfolio.user_id IN (:...userIds)', { userIds })
      .andWhere('portfolio.visibility != :private', { private: 'private' })
      .select([
        'portfolio.id',
        'portfolio.name',
        'portfolio.user_id',
        'metrics.avgReturn',
      ])
      .orderBy('metrics.avgReturn', 'DESC')
      .getRawMany()

    // Group by user and take the top portfolio for each
    const userPortfolios = new Map<string, any[]>()
    for (const portfolio of portfolios) {
      if (!userPortfolios.has(portfolio.portfolio_user_id)) {
        userPortfolios.set(portfolio.portfolio_user_id, [])
      }
      userPortfolios.get(portfolio.portfolio_user_id)!.push(portfolio)
    }

    for (const [userId, userPortfoliosList] of userPortfolios.entries()) {
      if (userPortfoliosList.length > 0) {
        const topPortfolio = userPortfoliosList[0]
        topPortfolios.set(userId, {
          id: topPortfolio.portfolio_id,
          name: topPortfolio.portfolio_name,
          returnPercent: Number(topPortfolio.metrics_avgReturn) || 0,
        })
      }
    }

    return topPortfolios
  }
}

