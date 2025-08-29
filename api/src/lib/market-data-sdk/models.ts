export type Exchange = 'NSE' | 'BSE' | 'POLYGON' | string

export interface Quote {
  symbol: string
  price: number
  asOf: string
  source: string
  open?: number
  high?: number
  low?: number
  prevClose?: number
}

export interface Candle {
	time: string
	open: number
	high: number
	low: number
	close: number
	volume: number
}

export type Interval = 1 | 5 | 10 | 60 | 240 | 1440 | 10080

export interface Instrument {
	symbol: string
	exchange: Exchange
	name?: string
	isin?: string
	token?: string
} 