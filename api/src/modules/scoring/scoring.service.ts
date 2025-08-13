import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ParticipantPrediction } from '../../entities/ParticipantPrediction.entity'
import { MarketResult } from '../../entities/MarketResult.entity'
import { ContestResult } from '../../entities/ContestResult.entity'
import { QuotesService } from '../stocks/quotes.service'
import { RuleRegistry } from '../engine/rule-registry'
import { QuotesMarketDataAdapter } from '../engine/market-data.adapter'

export interface ContestCalculator {
  calculateResults(contestConfig: any, predictions: ParticipantPrediction[], marketData: any): Array<{ user_id: string; raw: any }>
}

export interface ScoringStrategy {
  calculateScore(rawResult: any, params: any): number
}

export interface RankingStrategy {
  rank(scored: Array<{ user_id: string; score: number; extra?: any }>, params: any): Array<{ user_id: string; score: number; rank: number }>
}

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(ParticipantPrediction) private readonly predictions: Repository<ParticipantPrediction>,
    @InjectRepository(MarketResult) private readonly market: Repository<MarketResult>,
    @InjectRepository(ContestResult) private readonly results: Repository<ContestResult>,
    private readonly quotes: QuotesService,
    private readonly rules: RuleRegistry,
  ) {}

  // calculators, scoringStrategies, rankingStrategies ...
  private calculators: Record<string, ContestCalculator> = {
    gap_up_down: {
      calculateResults: (_config, predictions, market) => {
        return predictions.map((p) => {
          const todayClose = market?.todayClose
          const tomorrowOpen = market?.tomorrowOpen
          const actual = tomorrowOpen > todayClose ? 'Gap Up' : 'Gap Down'
          const isCorrect = String(p.prediction?.choice || '').toLowerCase() === String(actual).toLowerCase()
          return { user_id: p.user_id, raw: { predicted: p.prediction?.choice, actual, isCorrect, errorMargin: 0 } }
        })
      },
    },
    close_positive_negative: {
      calculateResults: (_config, predictions, market) => {
        const actual = market?.close > market?.prevClose ? 'Positive' : 'Negative'
        return predictions.map((p) => ({ user_id: p.user_id, raw: { predicted: p.prediction?.choice, actual, isCorrect: (p.prediction?.choice === actual), errorMargin: 0 } }))
      },
    },
    range_prediction: {
      calculateResults: (_config, predictions, market) => {
        const actualRange = (market?.high ?? 0) - (market?.low ?? 0)
        return predictions.map((p) => {
          const predictedRange = Number(p.prediction?.range ?? 0)
          const error = Math.abs(predictedRange - actualRange)
          return { user_id: p.user_id, raw: { predicted: predictedRange, actual: actualRange, isCorrect: error === 0, errorMargin: error } }
        })
      },
    },
    percent_change: {
      calculateResults: (_config, predictions, market) => {
        const pct = ((market?.close ?? 0) - (market?.open ?? 0)) / Math.max(1, market?.open ?? 1) * 100
        return predictions.map((p) => {
          const predictedPct = Number(p.prediction?.percent ?? 0)
          const error = Math.abs(predictedPct - pct)
          return { user_id: p.user_id, raw: { predicted: predictedPct, actual: pct, isCorrect: error === 0, errorMargin: error } }
        })
      },
    },
  }

  private scoringStrategies: Record<string, { calculateScore(raw: any, params: any): number }> = {
    exact_match: { calculateScore: (raw, params) => (raw.isCorrect ? (params?.points ?? 10) : 0) },
    margin_based: {
      calculateScore: (raw, params) => {
        const max = params?.maxPoints ?? 10
        const pen = params?.penaltyPerPercent ?? 1
        const err = Math.max(0, Number(raw.errorMargin ?? 0))
        return Math.max(0, Math.round(max - err * pen))
      },
    },
  }

  private rankingStrategies: Record<string, { rank(scored: Array<{ user_id: string; score: number; extra?: any }>, params: any): Array<{ user_id: string; score: number; rank: number }> }> = {
    highest_score: {
      rank: (scored) => scored
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((r, i) => ({ user_id: r.user_id, score: r.score, rank: i + 1 })),
    },
  }

  // New: rule-driven run using registry
  async runByRule(input: { contestId: string; type: string; instrumentSymbol: string; endAt: string; ruleConfig?: any }) {
    const preds = await this.predictions.find({ where: { contest_id: input.contestId } })
    const adapter = new QuotesMarketDataAdapter(this.quotes)
    const ctx = {
      contest: { instrumentSymbol: input.instrumentSymbol, endAt: new Date(input.endAt), ruleConfig: input.ruleConfig ?? {} },
      predictions: preds.map((p) => ({ id: p.id, userId: p.user_id, value: p.prediction?.value ?? p.prediction?.choice ?? p.prediction })),
      market: adapter,
      lockSnapshot: undefined,
      settleSnapshot: undefined,
    }
    const rule = this.rules.get(input.type)
    const lock = rule.lockSnapshot ? await rule.lockSnapshot(ctx as any, input.ruleConfig ?? {}) : undefined
    const outcomes = await rule.settle({ ...ctx, lockSnapshot: lock } as any, input.ruleConfig ?? {})

    // Simple scoring: exact match = 10; wrong = 0, like exact_match
    const scored = outcomes.map((o) => ({ user_id: preds.find((p) => p.id === o.predictionId)!.user_id, score: o.correct ? 10 : 0, extra: o }))
    const rankings = this.rankingStrategies.highest_score.rank(scored, {})

    for (const r of rankings) {
      const extra = scored.find((s) => s.user_id === r.user_id)?.extra
      const entity = this.results.create({ contest_id: input.contestId, user_id: r.user_id, raw_result: extra ?? {}, score: r.score, rank: r.rank, error_margin: extra?.errorMargin ?? null })
      await this.results
        .createQueryBuilder()
        .insert()
        .into('contest_results')
        .values(entity as any)
        .orUpdate(['raw_result', 'score', 'rank', 'error_margin', 'computed_at'], ['contest_id', 'user_id'], { skipUpdateIfNoValuesChanged: true })
        .execute()
    }

    return { scored: rankings }
  }

  // legacy run() remains for current flow...
  async run(contestId: string, contestConfig: any) {
    const predictions = await this.predictions.find({ where: { contest_id: contestId } })
    const marketData = await this.fetchMarketData(contestConfig, predictions)
    const calculatorKey = contestConfig?.calculator ?? 'gap_up_down'
    const calculator = this.calculators[calculatorKey] || this.calculators['gap_up_down']
    const raw = calculator.calculateResults(contestConfig, predictions, marketData)

    const scoringKey = contestConfig?.scoringMethod ?? 'exact_match'
    const scorer = this.scoringStrategies[scoringKey] || this.scoringStrategies['exact_match']
    const params = contestConfig?.scoringParams ?? {}
    const scored = raw.map((r) => ({ user_id: r.user_id, score: scorer.calculateScore(r.raw, params), extra: r.raw }))

    const rankKey = contestConfig?.rankingMethod ?? 'highest_score'
    const ranker = this.rankingStrategies[rankKey] || this.rankingStrategies['highest_score']
    const rankings = ranker.rank(scored, contestConfig?.rankingParams)

    // Persist and include ranks
    for (const r of rankings) {
      const extra = scored.find((s) => s.user_id === r.user_id)?.extra
      const entity = this.results.create({ contest_id: contestId, user_id: r.user_id, raw_result: extra ?? {}, score: r.score, rank: r.rank, error_margin: extra?.errorMargin ?? null })
      await this.results.save(entity)
    }

    return { scored: rankings, rankings }
  }

  async listResults(contestId: string, opts?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, opts?.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20))
    return this.results.find({
      where: { contest_id: contestId },
      order: { rank: 'ASC' as any, score: 'DESC' as any, computed_at: 'DESC' as any },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
  }

  async seedPredictions(contestId: string, symbol: string) {
    const samples = [
      { user_id: '00000000-0000-0000-0000-000000000001', prediction: { choice: 'Gap Up', range: 5, percent: 1.2 }, symbol },
      { user_id: '00000000-0000-0000-0000-000000000002', prediction: { choice: 'Gap Down', range: 3, percent: -0.7 }, symbol },
      { user_id: '00000000-0000-0000-0000-000000000003', prediction: { choice: 'Gap Up', range: 2, percent: 0.3 }, symbol },
    ]
    for (const s of samples) {
      const row = this.predictions.create({ contest_id: contestId, user_id: s.user_id, symbol: s.symbol, prediction: s.prediction })
      await this.predictions.save(row)
    }
    return { inserted: samples.length }
  }

  private async fetchMarketData(contestConfig: any, predictions: ParticipantPrediction[]) {
    try {
      const symbol = contestConfig?.symbol || predictions[0]?.symbol || 'NIFTY'
      const from = contestConfig?.from
      const to = contestConfig?.to
      const intervalMinutes = contestConfig?.intervalMinutes ?? 1
      const candles = await this.quotes.getHistory(symbol, from, to, intervalMinutes)
      if (!candles || candles.length === 0) return { open: 0, close: 0, high: 0, low: 0, prevClose: 0, todayClose: 0, tomorrowOpen: 0 }
      const opens = candles.map((c: any) => c.open)
      const closes = candles.map((c: any) => c.close)
      const highs = candles.map((c: any) => c.high)
      const lows = candles.map((c: any) => c.low)
      const open = opens[0]
      const close = closes[closes.length - 1]
      const high = Math.max(...highs)
      const low = Math.min(...lows)
      const prevClose = closes.length > 1 ? closes[closes.length - 2] : open
      const todayClose = prevClose
      const tomorrowOpen = open
      return { open, close, high, low, prevClose, todayClose, tomorrowOpen }
    } catch {
      return { todayClose: 100, tomorrowOpen: 101, close: 100, prevClose: 99, high: 105, low: 95, open: 99 }
    }
  }
} 