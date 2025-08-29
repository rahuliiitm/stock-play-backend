export interface QuoteResult {
  symbol: string
  price: number
  asOf: string
  source: string
  open?: number
  high?: number
  low?: number
  prevClose?: number
}

export interface CandleResult { time: string; open: number; high: number; low: number; close: number; volume: number }

export interface QuotesProvider {
  getQuote(symbol: string): Promise<QuoteResult>
  getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<CandleResult[]>
} 