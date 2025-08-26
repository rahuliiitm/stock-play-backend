import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../entities/User.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { LeaderboardEntry, LeaderboardWindow } from '../../entities/LeaderboardEntry.entity'
import { QuotesService } from '../stocks/quotes.service'

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PortfolioV2) private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(Holding) private readonly holdings: Repository<Holding>,
    @InjectRepository(LeaderboardEntry) private readonly entries: Repository<LeaderboardEntry>,
    private readonly quotes: QuotesService,
  ) {}

  async getLeaderboard(window: LeaderboardWindow = 'ALL') {
    const entries = await this.entries.find({ 
      where: { window },
      order: { return_percent: 'DESC', created_at: 'ASC' },
      take: 100,
      relations: ['portfolio', 'portfolio.user']
    })
    
    return entries.map((entry, index) => ({
      rank: index + 1,
      portfolioId: entry.portfolio_id,
      userId: entry.portfolio.user_id,
      displayName: entry.portfolio.user.display_name || entry.portfolio.user.email,
      returnPercent: entry.return_percent,
      createdAt: entry.created_at
    }))
  }

  async updatePortfolioRank(portfolioId: string, returnPercent: number) {
    const portfolio = await this.portfolios.findOne({ 
      where: { id: portfolioId },
      relations: ['holdings']
    })
    
    if (!portfolio) return

    // Calculate total market value
    let totalValueCents = 0
    for (const holding of portfolio.holdings) {
      totalValueCents += holding.current_value_cents || 0
    }

    // Update or create leaderboard entry
    await this.entries.save(
      this.entries.create({
        portfolio_id: portfolioId,
        window: 'ALL',
        return_percent: returnPercent,
        rank: 0, // Will be calculated by the ranking logic
      })
    )
  }

  async globalLeaderboard() {
    return this.getLeaderboard('ALL')
  }
} 