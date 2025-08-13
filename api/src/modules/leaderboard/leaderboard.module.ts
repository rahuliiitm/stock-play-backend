import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { User } from '../../entities/User.entity'
import { LeaderboardService } from './leaderboard.service'
import { LeaderboardController } from './leaderboard.controller'
import { StocksModule } from '../stocks/stocks.module'
import { LeaderboardSnapshot } from '../../entities/LeaderboardSnapshot.entity'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([ContestParticipant, Portfolio, Position, User, LeaderboardSnapshot]), StocksModule],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {} 