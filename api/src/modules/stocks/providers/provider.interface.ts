export interface QuoteResult {
  symbol: string
  priceCents: number
  asOf: string
  source: string
  openCents?: number
  highCents?: number
  lowCents?: number
  prevCloseCents?: number
}

export interface CandleResult { time: string; open: number; high: number; low: number; close: number; volume: number }

export interface QuotesProvider {
  getQuote(symbol: string): Promise<QuoteResult>
  getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<CandleResult[]>
} 