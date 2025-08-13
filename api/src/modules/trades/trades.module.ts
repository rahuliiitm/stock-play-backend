import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { Trade } from '../../entities/Trade.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { TradesService } from './trades.service'
import { TradesController } from './trades.controller'
import { Contest } from '../../entities/Contest.entity'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([Portfolio, Position, Trade, ContestParticipant, Contest])],
  providers: [TradesService],
  controllers: [TradesController],
})
export class TradesModule {} 