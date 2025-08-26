import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { LeaderboardModule } from '../leaderboard/leaderboard.module'
import { LeaderboardRefreshService } from './leaderboard-refresh.service'
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { PortfolioResult } from '../../entities/PortfolioResult.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity'
import { PortfolioJobsService } from './portfolio-jobs.service'
import { PortfolioModule } from '../portfolio/portfolio.module'
import { StocksModule } from '../stocks/stocks.module'
import { SymbolsJobsService } from './symbols-jobs.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      StockPriceHistory, 
      PortfolioResult, 
      PortfolioV2, 
      Holding, 
      PortfolioSnapshotV2
    ]),
    LeaderboardModule,
    PortfolioModule,
    StocksModule,
  ],
  providers: [LeaderboardRefreshService, PortfolioJobsService, SymbolsJobsService],
  exports: [LeaderboardRefreshService, PortfolioJobsService, SymbolsJobsService],
})
export class TasksModule {} 