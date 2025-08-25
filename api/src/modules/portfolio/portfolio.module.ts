import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { PortfolioService } from './portfolio.service'
import { PortfolioController } from './portfolio.controller'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Contest } from '../../entities/Contest.entity'
import { StocksModule } from '../stocks/stocks.module'
import { JwtModule } from '@nestjs/jwt'
import { PortfolioTransaction } from '../../entities/PortfolioTransaction.entity'
import { EngagementModule } from '../engagement/engagement.module'

@Module({
  imports: [
    JwtModule.register({}),
    StocksModule,
    EngagementModule,
    TypeOrmModule.forFeature([StockPriceHistory, Portfolio, Position, ContestParticipant, Contest, PortfolioTransaction]),
  ],
  providers: [PortfolioService],
  controllers: [PortfolioController],
  exports: [PortfolioService],
})
export class PortfolioModule {} 