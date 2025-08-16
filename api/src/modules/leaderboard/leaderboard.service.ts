import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { User } from '../../entities/User.entity'
import { QuotesService } from '../stocks/quotes.service'
import { LeaderboardSnapshot } from '../../entities/LeaderboardSnapshot.entity'

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
    @InjectRepository(Portfolio) private readonly portfolios: Repository<Portfolio>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly quotes: QuotesService,
    @InjectRepository(LeaderboardSnapshot) private readonly snapshots: Repository<LeaderboardSnapshot>,
  ) {}

  async contestLeaderboard(contestId: string) {
    const parts = await this.participants.find({ where: { contest_id: contestId } })
    const results = [] as Array<{ userId: string; displayName: string; portfolioValueCents: number; rank: number }>
    for (const p of parts) {
      const portfolio = await this.portfolios.findOne({ where: { participant_id: p.id } })
      const pos = await this.positions.find({ where: { portfolio_id: portfolio!.id } })
      let positionsValue = 0
      for (const x of pos) {
        const q = await this.quotes.getQuote(x.symbol)
        positionsValue += Math.round(q.priceCents * parseFloat(x.quantity))
      }
      const value = p.current_cash_amount + positionsValue
      const user = await this.users.findOne({ where: { id: p.user_id } })
      results.push({ userId: p.user_id, displayName: user?.display_name ?? user?.email ?? 'user', portfolioValueCents: value, rank: 0 })
    }
    results.sort((a, b) => b.portfolioValueCents - a.portfolioValueCents)
    results.forEach((r, i) => (r.rank = i + 1))
    return results
  }

  async snapshotContest(contestId: string) {
    const rankings = await this.contestLeaderboard(contestId)
    const snap = this.snapshots.create({ contest_id: contestId, as_of: new Date(), rankings })
    await this.snapshots.save(snap)
    return snap
  }

  async globalLeaderboard() {
    return []
  }
} 