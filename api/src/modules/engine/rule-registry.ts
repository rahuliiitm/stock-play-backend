import { Injectable } from '@nestjs/common'
import { ContestRule } from './interfaces'

@Injectable()
export class RuleRegistry {
  private readonly map = new Map<string, ContestRule>()

  register(type: string, rule: ContestRule) {
    this.map.set(type, rule)
  }

  get(type: string): ContestRule {
    const rule = this.map.get(type)
    if (!rule) throw new Error(`No rule registered for ${type}`)
    return rule
  }

  list(): string[] {
    return Array.from(this.map.keys()).sort()
  }
} 