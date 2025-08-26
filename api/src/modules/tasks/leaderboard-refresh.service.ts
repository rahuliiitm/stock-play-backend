import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Repository } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { LeaderboardService } from '../leaderboard/leaderboard.service'
import { PortfolioValueUpdateService } from '../portfolio/portfolio-value-update.service'

@Injectable()
export class LeaderboardRefreshService {
  constructor(
    @InjectRepository(PortfolioV2) private readonly portfolios: Repository<PortfolioV2>,
    private readonly leaderboard: LeaderboardService,
    private readonly portfolioValueUpdate: PortfolioValueUpdateService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshGlobalLeaderboard() {
    // First update portfolio values with current stock prices
    await this.portfolioValueUpdate.updatePublicPortfolioValues()
    
    // Then update leaderboard rankings
    const publicPortfolios = await this.portfolios.find({ 
      where: { visibility: 'public' },
      relations: ['holdings']
    })
    
    for (const portfolio of publicPortfolios) {
      try {
        // Calculate current return percentage
        let totalValueCents = 0
        for (const holding of portfolio.holdings) {
          totalValueCents += holding.current_value_cents || 0
        }
        
        const initialValueCents = portfolio.initial_value_cents || 0
        const returnPercent = initialValueCents > 0 ? ((totalValueCents - initialValueCents) / initialValueCents) * 100 : 0
        
        await this.leaderboard.updatePortfolioRank(portfolio.id, returnPercent)
      } catch (error) {
        // ignore errors, will retry next run
        console.error(`Failed to update portfolio ${portfolio.id}:`, error)
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateAllPortfolioValues() {
    await this.portfolioValueUpdate.updateAllPortfolioValues()
  }
} 