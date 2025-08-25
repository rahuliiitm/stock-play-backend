import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsJobsService } from '../tasks/analytics-jobs.service'
import { PortfolioPerformance } from '../../entities/PortfolioPerformance.entity'
import { PositionPerformance } from '../../entities/PositionPerformance.entity'
import { MarketMovers } from '../../entities/MarketMovers.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { StocksModule } from '../stocks/stocks.module'

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      PortfolioPerformance,
      PositionPerformance,
      MarketMovers,
      Portfolio,
      Position,
      ContestParticipant,
    ]),
    StocksModule,
  ],
  providers: [AnalyticsService, AnalyticsJobsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, AnalyticsJobsService],
})
export class AnalyticsModule {} 