import type { Candle, Quote, Interval, Instrument } from './models'

export interface MarketDataSource {
	getInstruments?(filters?: Partial<Instrument>): Promise<Instrument[]>
	getQuote(symbol: string): Promise<Quote>
	getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: Interval): Promise<Candle[]>
}

export interface HttpGetOptions {
	headers?: Record<string, string>
	params?: Record<string, any>
}

export type HttpGet = (url: string, options?: HttpGetOptions) => Promise<any> 