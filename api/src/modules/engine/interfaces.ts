export type RuleConfig = Record<string, any>

export interface MarketBar {
  dateISO: string
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
  prevClose?: number | null
}

export interface RuleContextContest {
  instrumentSymbol: string
  startAt?: Date
  lockAt?: Date
  endAt: Date
  ruleConfig?: RuleConfig
}

export interface RuleContextPrediction {
  id: string
  userId: string
  value: any
}

export interface MarketDataApi {
  getDaily(symbol: string, dateISO: string): Promise<MarketBar | null>
  getIntraday(symbol: string, fromISO: string, toISO: string): Promise<MarketBar[]>
}

export interface RuleContext {
  contest: RuleContextContest
  predictions: RuleContextPrediction[]
  market: MarketDataApi
  lockSnapshot?: any
  settleSnapshot?: any
}

export interface SettleOutcome {
  predictionId: string
  correct: boolean
  score?: number
  notes?: string
  errorMargin?: number
}

export interface ContestRule {
  validatePrediction?(input: any, cfg: RuleConfig): { normalized: any }
  lockSnapshot?(ctx: RuleContext, cfg: RuleConfig): Promise<any>
  settle(ctx: RuleContext, cfg: RuleConfig): Promise<SettleOutcome[]>
  scoring?(ctx: RuleContext, outcomes: SettleOutcome[], cfg: RuleConfig): Promise<void>
} 