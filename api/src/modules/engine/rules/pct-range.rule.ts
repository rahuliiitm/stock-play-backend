import { Injectable } from '@nestjs/common'
import { ContestRule, RuleContext, SettleOutcome } from '../interfaces'

@Injectable()
export class PctRangeRule implements ContestRule {
  validatePrediction(input: any) {
    if (typeof input !== 'string') throw new Error('Invalid prediction')
    return { normalized: input }
  }

  async lockSnapshot() {
    return {}
  }

  async settle(ctx: RuleContext): Promise<SettleOutcome[]> {
    const d = new Date(ctx.contest.endAt).toISOString().slice(0, 10)
    const day = await ctx.market.getDaily(ctx.contest.instrumentSymbol, d)
    if (!day || day.prevClose == null) throw new Error('Missing data')
    const pct = ((day.closePrice - day.prevClose) / day.prevClose) * 100
    const actual = this.toBucket(pct, ctx.contest.ruleConfig?.buckets ?? [0, 0.5, 1.0, 1.5])
    return ctx.predictions.map((p) => ({ predictionId: p.id, correct: p.value === actual }))
  }

  private toBucket(pct: number, edges: number[]): string {
    const ap = Math.abs(pct)
    for (let i = 0; i < edges.length; i++) {
      if (ap <= edges[i]) return i === 0 ? `0-${edges[i]}` : `${edges[i - 1]}-${edges[i]}`
    }
    return `>${edges[edges.length - 1]}`
  }
} 