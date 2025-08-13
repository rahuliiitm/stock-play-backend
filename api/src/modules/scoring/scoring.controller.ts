import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ScoringService } from './scoring.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'
import { RuleRegistry } from '../engine/rule-registry'

class RunScoringDto {
  @IsString()
  @IsNotEmpty()
  contestId!: string

  @IsObject()
  @IsNotEmpty()
  config!: any
}

class SeedDto {
  @IsString()
  @IsNotEmpty()
  contestId!: string

  @IsString()
  @IsNotEmpty()
  symbol!: string
}

class RunRuleDto {
  @IsString()
  @IsNotEmpty()
  contestId!: string

  @IsString()
  @IsNotEmpty()
  type!: string

  @IsString()
  @IsNotEmpty()
  instrumentSymbol!: string

  @IsString()
  @IsNotEmpty()
  endAt!: string

  @IsObject()
  @IsOptional()
  config?: any
}

@Controller('admin/scoring')
export class ScoringController {
  constructor(private readonly scoring: ScoringService, private readonly rules: RuleRegistry) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('rules')
  rulesList() {
    return { rules: this.rules.list() }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('run')
  run(@Body() body: RunScoringDto) {
    return this.scoring.run(body.contestId, body.config)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('run-rule')
  runRule(@Body() body: RunRuleDto) {
    return this.scoring.runByRule({ contestId: body.contestId, type: body.type, instrumentSymbol: body.instrumentSymbol, endAt: body.endAt, ruleConfig: body.config })
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('seed')
  seed(@Body() body: SeedDto) {
    return this.scoring.seedPredictions(body.contestId, body.symbol)
  }
}

@Controller('contests')
export class ScoringPublicController {
  constructor(private readonly scoring: ScoringService) {}

  @Get(':id/results')
  results(@Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? Number(page) : undefined
    const s = pageSize ? Number(pageSize) : undefined
    return this.scoring.listResults(id, { page: p, pageSize: s })
  }
} 