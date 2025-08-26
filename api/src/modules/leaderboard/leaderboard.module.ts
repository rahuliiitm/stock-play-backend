import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/User.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { LeaderboardEntry } from '../../entities/LeaderboardEntry.entity'
import { LeaderboardService } from './leaderboard.service'
import { LeaderboardController } from './leaderboard.controller'
import { StocksModule } from '../stocks/stocks.module'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [
    JwtModule.register({}), 
    TypeOrmModule.forFeature([User, PortfolioV2, Holding, LeaderboardEntry]), 
    StocksModule
  ],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {} 