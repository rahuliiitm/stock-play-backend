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
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { PortfolioResult } from '../../entities/PortfolioResult.entity'
import { PortfolioJobsService } from './portfolio-jobs.service'
import { PortfolioModule } from '../portfolio/portfolio.module'
import { StocksModule } from '../stocks/stocks.module'
import { SymbolsJobsService } from './symbols-jobs.service'
import { EventOrchestratorService } from './event-orchestrator.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Contest, ContestParticipant, Portfolio, Position, StockPriceHistory, PortfolioResult]),
    ScoringModule,
    LeaderboardModule,
    PortfolioModule,
    StocksModule,
  ],
  providers: [ContestLifecycleService, LeaderboardRefreshService, PortfolioJobsService, SymbolsJobsService, EventOrchestratorService],
  exports: [ContestLifecycleService, LeaderboardRefreshService, PortfolioJobsService, SymbolsJobsService, EventOrchestratorService],
})
export class TasksModule {} 