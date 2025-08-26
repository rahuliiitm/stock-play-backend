import { GrowwSource } from '../src/lib/market-data-sdk/sources/groww'
import axios from 'axios'

// Skips if env not present
const hasGroww = !!process.env.GROWW_API_KEY && (!!process.env.GROWW_ACCESS_TOKEN || !!process.env.GROWW_API_SECRET)

const suiteName = hasGroww ? 'Groww SDK (e2e)' : 'Groww SDK (e2e) [skipped: missing env]'

describe(suiteName, () => {
	let growwSource: GrowwSource

	beforeAll(async () => {
		if (!hasGroww) return

		// Create HTTP client
		const httpGet = async (url: string, options?: any) => {
			const response = await axios.get(url, {
				headers: {
					'Accept': 'application/json',
					'X-API-VERSION': '1.0',
					'X-API-KEY': process.env.GROWW_API_KEY,
					'Authorization': `Bearer ${process.env.GROWW_ACCESS_TOKEN}`,
					...options?.headers,
				},
				params: options?.params,
			})
			return response.data
		}

		growwSource = new GrowwSource({
			httpGet,
			getAccessToken: async () => process.env.GROWW_ACCESS_TOKEN || null,
			baseUrl: process.env.GROWW_API_BASE || 'https://api.groww.in',
			apiKey: process.env.GROWW_API_KEY,
			appId: process.env.GROWW_APP_ID,
		})
	})

	const symbol = 'RELIANCE'

	it('getQuote returns quote data', async () => {
		if (!hasGroww) return
		
		const quote = await growwSource.getQuote(symbol)
		
		expect(quote).toHaveProperty('symbol', symbol)
		expect(typeof quote.priceCents).toBe('number')
		expect(quote.priceCents).toBeGreaterThan(0)
		expect(quote.source).toBe('groww')
	}, 10000)

	it('getHistory returns candle data', async () => {
		if (!hasGroww) return
		
		const candles = await growwSource.getHistory(symbol, undefined, undefined, 1440)
		
		expect(Array.isArray(candles)).toBe(true)
		if (candles.length > 0) {
			expect(candles[0]).toHaveProperty('time')
			expect(candles[0]).toHaveProperty('open')
			expect(candles[0]).toHaveProperty('high')
			expect(candles[0]).toHaveProperty('low')
			expect(candles[0]).toHaveProperty('close')
			expect(candles[0]).toHaveProperty('volume')
		}
	}, 15000)

	it('getHoldings returns holdings data', async () => {
		if (!hasGroww) return
		
		const holdings = await growwSource.getHoldings()
		
		expect(Array.isArray(holdings)).toBe(true)
		if (holdings.length > 0) {
			expect(holdings[0]).toHaveProperty('symbol')
			expect(holdings[0]).toHaveProperty('quantity')
			expect(holdings[0]).toHaveProperty('avgPrice')
		}
	}, 10000)

	it('getPositions returns positions data', async () => {
		if (!hasGroww) return
		
		const positions = await growwSource.getPositions()
		
		expect(Array.isArray(positions)).toBe(true)
	}, 10000)
})
