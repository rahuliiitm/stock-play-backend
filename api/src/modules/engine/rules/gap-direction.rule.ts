import { Injectable } from '@nestjs/common'
import { ContestRule, RuleContext, SettleOutcome } from '../interfaces'

@Injectable()
export class GapDirectionRule implements ContestRule {
  validatePrediction(input: any) {
    const allowed = ['GAP_UP', 'GAP_DOWN', 'FLAT']
    if (!allowed.includes(input)) throw new Error('Invalid prediction')
    return { normalized: input }
  }

  async lockSnapshot(ctx: RuleContext) {
    const d = new Date(ctx.contest.lockAt || ctx.contest.endAt)
    d.setDate(d.getDate() - 1)
    const prevDate = d.toISOString().slice(0, 10)
    const prev = await ctx.market.getDaily(ctx.contest.instrumentSymbol, prevDate)
    return { prevClose: prev?.closePrice }
  }

  async settle(ctx: RuleContext): Promise<SettleOutcome[]> {
    const dateISO = new Date(ctx.contest.endAt).toISOString().slice(0, 10)
    const day = await ctx.market.getDaily(ctx.contest.instrumentSymbol, dateISO)
    if (!day || ctx.lockSnapshot?.prevClose == null) throw new Error('Missing data')

    const open = day.openPrice
    const prevClose = ctx.lockSnapshot.prevClose
    const diffPct = ((open - prevClose) / prevClose) * 100
    const actual = Math.abs(diffPct) < (ctx.contest.ruleConfig?.flatThresholdPct ?? 0.2) ? 'FLAT' : diffPct > 0 ? 'GAP_UP' : 'GAP_DOWN'

    return ctx.predictions.map((p) => ({ predictionId: p.id, correct: p.value === actual, notes: `actual=${actual}, diffPct=${diffPct.toFixed(2)}` }))
  }
} 