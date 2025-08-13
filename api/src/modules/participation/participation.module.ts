import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { ParticipationController } from './participation.controller'
import { ParticipationService } from './participation.service'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([Contest, ContestParticipant, Portfolio])],
  controllers: [ParticipationController],
  providers: [ParticipationService],
  exports: [ParticipationService],
})
export class ParticipationModule {} 