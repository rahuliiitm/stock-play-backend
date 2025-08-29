import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsJobsService } from '../tasks/analytics-jobs.service'
import { PortfolioPerformance } from '../../entities/PortfolioPerformance.entity'
import { PositionPerformance } from '../../entities/PositionPerformance.entity'
import { MarketMovers } from '../../entities/MarketMovers.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Position } from '../../entities/Position.entity'

import { StocksModule } from '../stocks/stocks.module'

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      PortfolioPerformance,
      PositionPerformance,
      MarketMovers,
      PortfolioV2,
      Position,
    ]),
    StocksModule,
  ],
  providers: [AnalyticsService, AnalyticsJobsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, AnalyticsJobsService],
})
export class AnalyticsModule {} 