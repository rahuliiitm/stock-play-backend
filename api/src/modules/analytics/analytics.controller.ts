import { Controller, Get, Param, Query, UseGuards, Req, Post } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { AnalyticsJobsService } from '../tasks/analytics-jobs.service'

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService, private readonly jobs: AnalyticsJobsService) {}

  // ===========================================
  // PORTFOLIO ANALYTICS ENDPOINTS
  // ===========================================

  @UseGuards(JwtAuthGuard)
  @Get('portfolio/:portfolioId/performance')
  async getPortfolioPerformance(
    @Param('portfolioId') portfolioId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.analytics.getPortfolioAnalytics(portfolioId, from, to)
  }

  @UseGuards(JwtAuthGuard)
  @Get('portfolio/:portfolioId/positions')
  async getPositionAnalytics(
    @Param('portfolioId') portfolioId: string,
    @Query('days') days: string = '30'
  ) {
    throw new Error('Position analytics not yet implemented for new system')
  }

  @UseGuards(JwtAuthGuard)
  @Get('contest/:contestId/portfolio/performance')
  async getContestPortfolioPerformance(
    @Param('contestId') contestId: string,
    @Req() req: any,
    @Query('days') days: string = '30'
  ) {
    // This would need to get the user's portfolio for the contest
    // Implementation depends on how you want to link contest -> portfolio
    return { message: 'Not implemented yet' }
  }

  // ===========================================
  // MARKET MOVERS ENDPOINTS
  // ===========================================

  @Get('market/gainers-losers')
  async getGainersLosers(
    @Query('period') period: 'daily' | 'weekly' = 'daily',
    @Query('date') dateStr?: string
  ) {
    throw new Error('Market movers not yet implemented for new system')
  }

  @Get('market/gainers')
  async getTopGainers(
    @Query('period') period: 'daily' | 'weekly' = 'daily',
    @Query('date') dateStr?: string
  ) {
    throw new Error('Market movers not yet implemented for new system')
  }

  @Get('market/losers')
  async getTopLosers(
    @Query('period') period: 'daily' | 'weekly' = 'daily',
    @Query('date') dateStr?: string
  ) {
    throw new Error('Market movers not yet implemented for new system')
  }

  // ===========================================
  // ADMIN ENDPOINTS FOR CALCULATION TRIGGERS
  // ===========================================

  @UseGuards(JwtAuthGuard)
  @Post('admin/calculate-daily-performance')
  async triggerDailyPerformanceCalculation(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date()
    const result = await this.jobs.triggerPerformanceCalculation(date)
    return { message: 'Daily performance calculation triggered', date, result }
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/calculate-gainers-losers')
  async triggerGainersLosersCalculation(@Query('date') dateStr?: string) {
    throw new Error('Market movers calculation not yet implemented for new system')
  }

  // ===========================================
  // TEMP: BACKFILL ENDPOINT FOR TESTING ONLY (to be removed)
  // ===========================================

  @UseGuards(JwtAuthGuard)
  @Post('admin/backfill')
  async backfill(
    @Query('days') daysStr: string = '2',
    @Query('portfolioId') portfolioId?: string
  ) {
    const days = Math.max(1, parseInt(daysStr, 10) || 2)
    const today = new Date()

    const results: any[] = []

    if (portfolioId) {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        try {
          const perf = await this.analytics.calculateDailyPortfolioPerformance(portfolioId, d)
          // Calculate positions for this portfolio for the same date
          results.push({ date: d.toISOString().slice(0, 10), ok: true, portfolioId })
        } catch (e: any) {
          results.push({ date: d.toISOString().slice(0, 10), ok: false, error: e?.message || String(e) })
        }
      }
    } else {
      // If no portfolio specified, use jobs to process all
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const r = await this.jobs.triggerPerformanceCalculation(d)
        results.push({ date: d.toISOString().slice(0, 10), ...r })
      }
    }

    return { message: 'Backfill complete', days, portfolioId: portfolioId || null, results }
  }
} 