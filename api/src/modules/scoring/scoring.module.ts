import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ParticipantPrediction } from '../../entities/ParticipantPrediction.entity'
import { MarketResult } from '../../entities/MarketResult.entity'
import { ContestResult } from '../../entities/ContestResult.entity'
import { StocksModule } from '../stocks/stocks.module'
import { JwtModule } from '@nestjs/jwt'
import { RuleRegistry } from '../engine/rule-registry'
import { GapDirectionRule } from '../engine/rules/gap-direction.rule'
import { CloseDirectionRule } from '../engine/rules/close-direction.rule'
import { PctRangeRule } from '../engine/rules/pct-range.rule'
import { RuleRegistrar } from '../engine/rule-registrar'
import { ScoringController, ScoringPublicController } from './scoring.controller'
import { ScoringService } from './scoring.service'

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([ParticipantPrediction, MarketResult, ContestResult]), StocksModule],
  providers: [ScoringService, RuleRegistry, GapDirectionRule, CloseDirectionRule, PctRangeRule, RuleRegistrar],
  controllers: [ScoringController, ScoringPublicController],
  exports: [ScoringService, RuleRegistry],
})
export class ScoringModule {} 