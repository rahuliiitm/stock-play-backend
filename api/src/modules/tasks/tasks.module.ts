import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { ScheduleModule } from '@nestjs/schedule'
import { ScoringModule } from '../scoring/scoring.module'
import { LeaderboardModule } from '../leaderboard/leaderboard.module'
import { ContestLifecycleService } from './contest-lifecycle.service'
import { LeaderboardRefreshService } from './leaderboard-refresh.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Contest, ContestParticipant, Portfolio, Position]),
    ScoringModule,
    LeaderboardModule,
  ],
  providers: [ContestLifecycleService, LeaderboardRefreshService],
  exports: [ContestLifecycleService, LeaderboardRefreshService],
})
export class TasksModule {} 