/**
 * Abstract interface for market data providers
 * Supports both real-time and historical data sources
 */
export interface MarketDataProvider {
  /**
   * Get live quote for a symbol
   */
  getQuote(symbol: string): Promise<QuoteData | null>

  /**
   * Get historical candles for a symbol
   */
  getHistoricalCandles(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
  ): Promise<CandleData[]>

  /**
   * Get option chain data for a symbol
   */
  getOptionChain(symbol: string, expiry?: string): Promise<OptionChainData | null>

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>
}

export interface QuoteData {
  symbol: string
  ltp: number
  price: number
  volume: number
  timestamp: number
  exchange?: string
  segment?: string
}

export interface CandleData {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  timeframe: string
}

export interface OptionChainData {
  underlying: string
  expiry: string
  strikes: OptionStrikeData[]
  calls: OptionStrikeData[]
  puts: OptionStrikeData[]
}

export interface OptionStrikeData {
  strike: number
  type: 'CE' | 'PE'
  symbol: string
  ltp: number
  volume: number
  oi: number
  bid: number
  ask: number
}
