import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { ContestsService } from './contests.service'
import { ContestsController } from './contests.controller'
import { StocksModule } from '../stocks/stocks.module'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([Contest, ContestParticipant]), StocksModule],
  providers: [ContestsService],
  controllers: [ContestsController],
})
export class ContestsModule {} 