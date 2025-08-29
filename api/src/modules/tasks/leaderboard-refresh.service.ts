import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { LeaderboardService } from '../leaderboard/leaderboard.service'
import { PortfolioValueUpdateService } from '../portfolio/portfolio-value-update.service'

@Injectable()
export class LeaderboardRefreshService {
  private readonly logger = new Logger(LeaderboardRefreshService.name)

  constructor(
    @InjectRepository(PortfolioV2) private readonly portfolios: Repository<PortfolioV2>,
    private readonly leaderboard: LeaderboardService,
    private readonly portfolioValueUpdate: PortfolioValueUpdateService,
  ) {}

  /**
   * Event listener for leaderboard updates (replaces 5-minute scheduler)
   */
  async onLeaderboardUpdateRequest() {
    this.logger.log('Received leaderboard update request via event')
    await this.refreshGlobalLeaderboard()
  }

  /**
   * Event listener for portfolio value updates (replaces hourly scheduler)
   */
  async onPortfolioValueUpdateRequest() {
    this.logger.log('Received portfolio value update request via event')
    await this.updateAllPortfolioValues()
  }

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
        let totalValue = 0
        for (const holding of portfolio.holdings) {
          totalValue += holding.current_value || 0
        }
        
        const initialValue = portfolio.initial_value || 0
        const returnPercent = initialValue > 0 ? ((totalValue - initialValue) / initialValue) * 100 : 0
        
        await this.leaderboard.updatePortfolioRank(portfolio.id, returnPercent)
      } catch (error) {
        // ignore errors, will retry next run
        console.error(`Failed to update portfolio ${portfolio.id}:`, error)
      }
    }
  }

  async updateAllPortfolioValues() {
    await this.portfolioValueUpdate.updateAllPortfolioValues()
  }
} 