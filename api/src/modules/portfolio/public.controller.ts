import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { LeaderboardService } from './leaderboard.service'
import type { LeaderboardWindow } from './leaderboard.service'
import { PortfolioServiceV2 } from './portfolio-v2.service'
import { HoldingsService } from './holdings.service'
import { SearchService } from './search.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard'

class LeaderboardQueryDto {
  window?: LeaderboardWindow = 'WEEKLY'
  limit?: number = 50
  offset?: number = 0
  minReturnPercent?: number
}

@Controller('public')
export class PublicController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly portfolioService: PortfolioServiceV2,
    private readonly holdingsService: HoldingsService,
    private readonly searchService: SearchService,
  ) {}

  @Get('leaderboard')
  async getLeaderboard(@Query() query: LeaderboardQueryDto) {
    const { window = 'WEEKLY', limit = 50, offset = 0, minReturnPercent } = query

    if (limit > 100) {
      throw new HttpException('Limit cannot exceed 100', HttpStatus.BAD_REQUEST)
    }

    const results = await this.leaderboardService.getLeaderboard({
      window,
      limit,
      offset,
      minReturnPercent,
      includePrivate: false, // Never include private portfolios
    })

    return {
      window,
      results,
      total: results.length,
      hasMore: results.length === limit,
    }
  }

  @Get('leaderboard/stats')
  async getLeaderboardStats(@Query('window') window: LeaderboardWindow = 'WEEKLY') {
    return this.leaderboardService.getLeaderboardStats(window)
  }

  @Get('portfolios/:portfolioId')
  @UseGuards(OptionalJwtAuthGuard) // Allow both authenticated and anonymous access
  async getPublicPortfolio(@Param('portfolioId') portfolioId: string, @Req() req?: any) {
    // First check if portfolio exists and is public/unlisted
    const portfolios = await this.portfolioService.getUserPortfolios('') // We don't need user portfolios, just checking visibility
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      // Check if portfolio exists but is private (don't reveal existence)
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    if (portfolio.visibility === 'private') {
      // Check if user is authenticated and owns the portfolio
      if (!req?.user?.sub) {
        throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
      }

      // Verify ownership
      const userPortfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
      const userPortfolio = userPortfolios.find(p => p.id === portfolioId)

      if (!userPortfolio) {
        throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
      }
    }

    // Return portfolio with holdings
    const holdings = await this.holdingsService.getPortfolioHoldings(portfolioId)

    return {
      id: portfolio.id,
      name: portfolio.name,
      visibility: portfolio.visibility,
      createdAt: portfolio.createdAt,
      metrics: portfolio.metrics,
      holdings: portfolio.visibility === 'public' ? holdings : [], // Only show holdings for public portfolios
    }
  }

  @Get('portfolios/:portfolioId/rank')
  async getPortfolioRank(
    @Param('portfolioId') portfolioId: string,
    @Query('window') window: LeaderboardWindow = 'WEEKLY'
  ) {
    const rank = await this.leaderboardService.getPortfolioRank(portfolioId, window)

    if (!rank) {
      throw new HttpException('Portfolio rank not found', HttpStatus.NOT_FOUND)
    }

    return rank
  }

  @Get('portfolios/:portfolioId/performance')
  async getPortfolioPerformance(
    @Param('portfolioId') portfolioId: string,
    @Query('window') window: LeaderboardWindow = 'MONTHLY'
  ) {
    // Check if portfolio is public
    const portfolios = await this.portfolioService.getUserPortfolios('')
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio || portfolio.visibility === 'private') {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const history = await this.leaderboardService.getPortfolioPerformanceHistory(portfolioId, window)

    return {
      portfolioId,
      window,
      history,
    }
  }

  @Get('search/portfolios')
  async searchPortfolios(@Query() query: any) {
    const { q: searchQuery, limit = 20, offset = 0, sortBy, sortOrder, minReturnPercent } = query

    if (!searchQuery || searchQuery.length < 2) {
      return { results: [], total: 0, hasMore: false }
    }

    if (limit > 50) {
      throw new HttpException('Limit cannot exceed 50', HttpStatus.BAD_REQUEST)
    }

    const filters = {
      query: searchQuery,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder,
      minReturnPercent: minReturnPercent ? parseFloat(minReturnPercent) : undefined,
      visibility: 'public' as const,
    }

    return this.searchService.searchPortfolios(filters)
  }

  @Get('search/users')
  async searchUsers(@Query() query: any) {
    const { q: searchQuery, limit = 20, offset = 0 } = query

    if (!searchQuery || searchQuery.length < 2) {
      return { results: [], total: 0, hasMore: false }
    }

    if (limit > 50) {
      throw new HttpException('Limit cannot exceed 50', HttpStatus.BAD_REQUEST)
    }

    return this.searchService.searchUsers(searchQuery, limit, offset)
  }

  @Get('trending')
  async getTrendingPortfolios(@Query('limit') limit: number = 10) {
    if (limit > 50) {
      throw new HttpException('Limit cannot exceed 50', HttpStatus.BAD_REQUEST)
    }

    const results = await this.searchService.getPopularPortfolios(limit)

    return {
      results,
      total: results.length,
    }
  }

  @Get('suggestions')
  @UseGuards(OptionalJwtAuthGuard)
  async getPortfolioSuggestions(@Req() req?: any, @Query('limit') limit: number = 5) {
    if (limit > 20) {
      throw new HttpException('Limit cannot exceed 20', HttpStatus.BAD_REQUEST)
    }

    const userId = req?.user?.sub || null
    return this.searchService.getPortfolioSuggestions(userId, limit)
  }

  @Get('stats')
  async getPublicStats() {
    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.leaderboardService.getLeaderboardStats('DAILY'),
      this.leaderboardService.getLeaderboardStats('WEEKLY'),
      this.leaderboardService.getLeaderboardStats('MONTHLY'),
    ])

    return {
      daily: dailyStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
      lastUpdated: new Date(),
    }
  }
}

