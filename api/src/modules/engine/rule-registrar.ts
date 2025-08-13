import { Injectable, OnModuleInit } from '@nestjs/common'
import { RuleRegistry } from './rule-registry'
import { GapDirectionRule } from './rules/gap-direction.rule'
import { CloseDirectionRule } from './rules/close-direction.rule'
import { PctRangeRule } from './rules/pct-range.rule'

@Injectable()
export class RuleRegistrar implements OnModuleInit {
  constructor(
    private readonly registry: RuleRegistry,
    private readonly gap: GapDirectionRule,
    private readonly close: CloseDirectionRule,
    private readonly pct: PctRangeRule,
  ) {}

  onModuleInit() {
    this.registry.register('GAP_DIRECTION', this.gap)
    this.registry.register('CLOSE_DIRECTION', this.close)
    this.registry.register('PCT_RANGE', this.pct)
  }
} 