import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { EngagementService } from './engagement.service'
import { EngagementController } from './engagement.controller'
import { PortfolioSubscription } from '../../entities/PortfolioSubscription.entity'
import { PortfolioLike } from '../../entities/PortfolioLike.entity'
import { PortfolioComment } from '../../entities/PortfolioComment.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { User } from '../../entities/User.entity'

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([PortfolioSubscription, PortfolioLike, PortfolioComment, PortfolioV2, User])],
  providers: [EngagementService],
  controllers: [EngagementController],
  exports: [EngagementService],
})
export class EngagementModule {} 