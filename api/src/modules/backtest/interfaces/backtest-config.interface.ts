import { EmaGapAtrConfig } from '../../strategy/services/ema-gap-atr-strategy.service'

export interface BacktestConfig {
  symbol: string
  timeframe: string
  startDate: Date
  endDate: Date
  initialBalance: number
  strategyConfig: EmaGapAtrConfig
}

export interface BacktestResult {
  totalReturn: number
  totalReturnPercentage: number
  maxDrawdown: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  sharpeRatio: number
  trades: TradeResult[]
  equityCurve: EquityPoint[]
}

export interface TradeResult {
  entryTime: Date
  exitTime: Date
  symbol: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPercentage: number
  duration: number
}

export interface EquityPoint {
  timestamp: Date
  balance: number
  equity: number
  drawdown: number
}

export interface BacktestRunRequest {
  name: string
  description: string
  config: BacktestConfig
}

export interface BacktestRunResponse {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  result?: BacktestResult
  error?: string
  createdAt: Date
  completedAt?: Date
}
