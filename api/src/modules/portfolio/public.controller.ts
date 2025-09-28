import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PortfolioServiceV2 } from './portfolio-v2.service';
import { HoldingsService } from './holdings.service';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

@Controller('public')
export class PublicController {
  constructor(
    private readonly portfolioService: PortfolioServiceV2,
    private readonly holdingsService: HoldingsService,
    private readonly searchService: SearchService,
  ) {}

  @Get('portfolios/:portfolioId')
  @UseGuards(OptionalJwtAuthGuard) // Allow both authenticated and anonymous access
  async getPublicPortfolio(
    @Param('portfolioId') portfolioId: string,
    @Req() req?: any,
  ) {
    // First check if portfolio exists and is public/unlisted
    const portfolios = await this.portfolioService.getUserPortfolios(''); // We don't need user portfolios, just checking visibility
    const portfolio = portfolios.find((p) => p.id === portfolioId);

    if (!portfolio) {
      // Check if portfolio exists but is private (don't reveal existence)
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND);
    }

    if (portfolio.visibility === 'private') {
      // Check if user is authenticated and owns the portfolio
      if (!req?.user?.sub) {
        throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND);
      }

      // Verify ownership
      const userPortfolios = await this.portfolioService.getUserPortfolios(
        req.user.sub,
      );
      const userPortfolio = userPortfolios.find((p) => p.id === portfolioId);

      if (!userPortfolio) {
        throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND);
      }
    }

    // Return portfolio with holdings
    const holdings =
      await this.holdingsService.getPortfolioHoldings(portfolioId);

    return {
      id: portfolio.id,
      name: portfolio.name,
      visibility: portfolio.visibility,
      createdAt: portfolio.createdAt,
      metrics: portfolio.metrics,
      holdings: portfolio.visibility === 'public' ? holdings : [], // Only show holdings for public portfolios
    };
  }

  @Get('portfolios/:portfolioId/performance')
  async getPortfolioPerformance(
    @Param('portfolioId') portfolioId: string,
    @Query('window') window: string = 'MONTHLY',
  ) {
    // Check if portfolio is public
    const portfolios = await this.portfolioService.getUserPortfolios('');
    const portfolio = portfolios.find((p) => p.id === portfolioId);

    if (!portfolio || portfolio.visibility === 'private') {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND);
    }

    // Return basic performance data without leaderboard
    const history = [];

    return {
      portfolioId,
      window,
      history,
    };
  }

  @Get('search/portfolios')
  async searchPortfolios(@Query() query: any) {
    const {
      q: searchQuery,
      limit = 20,
      offset = 0,
      sortBy,
      sortOrder,
      minReturnPercent,
    } = query;

    if (!searchQuery || searchQuery.length < 2) {
      return { results: [], total: 0, hasMore: false };
    }

    if (limit > 50) {
      throw new HttpException('Limit cannot exceed 50', HttpStatus.BAD_REQUEST);
    }

    const filters = {
      query: searchQuery,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder,
      minReturnPercent: minReturnPercent
        ? parseFloat(minReturnPercent)
        : undefined,
      visibility: 'public' as const,
    };

    return this.searchService.searchPortfolios(filters);
  }

  @Get('search/users')
  async searchUsers(@Query() query: any) {
    const { q: searchQuery, limit = 20, offset = 0 } = query;

    if (!searchQuery || searchQuery.length < 2) {
      return { results: [], total: 0, hasMore: false };
    }

    if (limit > 50) {
      throw new HttpException('Limit cannot exceed 50', HttpStatus.BAD_REQUEST);
    }

    return this.searchService.searchUsers(searchQuery, limit, offset);
  }

  @Get('trending')
  async getTrendingPortfolios(@Query('limit') limit: number = 10) {
    if (limit > 50) {
      throw new HttpException('Limit cannot exceed 50', HttpStatus.BAD_REQUEST);
    }

    const results = await this.searchService.getPopularPortfolios(limit);

    return {
      results,
      total: results.length,
    };
  }

  @Get('suggestions')
  @UseGuards(OptionalJwtAuthGuard)
  async getPortfolioSuggestions(
    @Req() req?: any,
    @Query('limit') limit: number = 5,
  ) {
    if (limit > 20) {
      throw new HttpException('Limit cannot exceed 20', HttpStatus.BAD_REQUEST);
    }

    const userId = req?.user?.sub || null;
    return this.searchService.getPortfolioSuggestions(userId, limit);
  }

  @Get('stats')
  async getPublicStats() {
    // Return basic stats without leaderboard data
    return {
      daily: { totalPortfolios: 0, averageReturn: 0 },
      weekly: { totalPortfolios: 0, averageReturn: 0 },
      monthly: { totalPortfolios: 0, averageReturn: 0 },
      lastUpdated: new Date(),
    };
  }
}
