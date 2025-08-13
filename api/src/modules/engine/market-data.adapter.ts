import { Injectable } from '@nestjs/common'
import { QuotesService } from '../stocks/quotes.service'
import type { MarketBar, MarketDataApi } from './interfaces'

function dateToIstRange(dateISO: string): { from: string; to: string } {
	const d = new Date(dateISO + 'T00:00:00Z')
	// Set to 09:15 to 15:30 IST for the given date
	const pad = (n: number) => String(n).padStart(2, '0')
	const y = d.getUTCFullYear()
	const m = pad(d.getUTCMonth() + 1)
	const day = pad(d.getUTCDate())
	const from = `${y}-${m}-${day} 09:15:00`
	const to = `${y}-${m}-${day} 15:30:00`
	return { from, to }
}

@Injectable()
export class QuotesMarketDataAdapter implements MarketDataApi {
	constructor(private readonly quotes: QuotesService) {}

	async getDaily(symbol: string, dateISO: string): Promise<MarketBar | null> {
		const { from, to } = dateToIstRange(dateISO)
		const candles = await this.quotes.getHistory(symbol, from, to, 1)
		if (!candles || candles.length === 0) return null
		const openPrice = candles[0].open
		const closePrice = candles[candles.length - 1].close
		let highPrice = -Infinity
		let lowPrice = Infinity
		for (const c of candles) {
			highPrice = Math.max(highPrice, c.high)
			lowPrice = Math.min(lowPrice, c.low)
		}
		// prevClose: previous day close if available
		const prev = new Date(dateISO + 'T00:00:00Z')
		prev.setUTCDate(prev.getUTCDate() - 1)
		const prevISO = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`
		const prevRange = dateToIstRange(prevISO)
		const prevCandles = await this.quotes.getHistory(symbol, prevRange.from, prevRange.to, 1)
		const prevClose = prevCandles && prevCandles.length > 0 ? prevCandles[prevCandles.length - 1].close : null
		return { dateISO, openPrice, highPrice, lowPrice, closePrice, prevClose }
	}

	async getIntraday(symbol: string, fromISO: string, toISO: string): Promise<MarketBar[]> {
		const candles = await this.quotes.getHistory(symbol, fromISO, toISO, 1)
		if (!candles || candles.length === 0) return []
		// Map each minute candle into a MarketBar-like shape (date aggregated by timestamp date)
		return candles.map((c) => ({
			dateISO: new Date(c.time).toISOString().slice(0, 10),
			openPrice: c.open,
			highPrice: c.high,
			lowPrice: c.low,
			closePrice: c.close,
			prevClose: null,
		}))
	}
} 