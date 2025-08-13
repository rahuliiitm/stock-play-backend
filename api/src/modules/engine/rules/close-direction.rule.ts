import { Injectable } from '@nestjs/common'
import { ContestRule, RuleContext, SettleOutcome } from '../interfaces'

@Injectable()
export class CloseDirectionRule implements ContestRule {
  validatePrediction(input: any) {
    const allowed = ['POS', 'NEG', 'FLAT']
    if (!allowed.includes(input)) throw new Error('Invalid prediction')
    return { normalized: input }
  }

  async lockSnapshot() {
    return {}
  }

  async settle(ctx: RuleContext): Promise<SettleOutcome[]> {
    const d = new Date(ctx.contest.endAt).toISOString().slice(0, 10)
    const day = await ctx.market.getDaily(ctx.contest.instrumentSymbol, d)
    if (!day || day.prevClose == null) throw new Error('Missing data')
    const changePct = ((day.closePrice - day.prevClose) / day.prevClose) * 100
    const actual = Math.abs(changePct) < (ctx.contest.ruleConfig?.flatThresholdPct ?? 0.1) ? 'FLAT' : changePct > 0 ? 'POS' : 'NEG'
    return ctx.predictions.map((p) => ({ predictionId: p.id, correct: p.value === actual, notes: `actual=${actual}, changePct=${changePct.toFixed(2)}` }))
  }
} 