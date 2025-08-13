import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Repository } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { ScoringService } from '../scoring/scoring.service'
import { LeaderboardService } from '../leaderboard/leaderboard.service'

@Injectable()
export class LeaderboardRefreshService {
  constructor(
    @InjectRepository(Contest) private readonly contests: Repository<Contest>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
    private readonly scoring: ScoringService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshActive() {
    const active = await this.contests.find({ where: { status: 'active' as any } })
    for (const c of active) {
      await this.refreshContestLeaderboard(c.id)
    }
  }

  async refreshContestLeaderboard(contestId: string) {
    await this.leaderboard.snapshotContest(contestId)
    return true
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scoreEndedContests() {
    const ended = await this.contests.find({ where: { status: 'ended' as any } })
    for (const c of ended) {
      try {
        await this.scoring.run(c.id, { calculator: 'gap_up_down', scoringMethod: 'exact_match', rankingMethod: 'highest_score' })
        await this.leaderboard.snapshotContest(c.id)
      } catch {
        // ignore errors, will retry next run
      }
    }
  }
} 