import type { Candle, Quote } from '../models'
import type { HttpGet, HttpGetOptions, MarketDataSource } from '../source'

export interface GrowwSourceOptions {
	httpGet: HttpGet
	httpPost?: (url: string, data?: any, options?: HttpGetOptions) => Promise<any>
	getAccessToken?: () => Promise<string | null>
	baseUrl?: string
	apiKey?: string
	appId?: string
}

export interface GrowwHolding {
	symbol: string
	quantity: number
	avgCostPrice: number
	avgPrice: number
	ltp: number
	currentPrice: number
	product: string
	exchange: string
	instrumentToken: string
}

export interface GrowwOrder {
	orderId: string
	orderTimestamp: string
	exchangeOrderId: string
	parentOrderId: string | null
	status: string
	statusMessage: string
	orderType: string
	price: number
	quantity: number
	disclosedQuantity: number
	duration: string
	product: string
	orderSide: string
	exchange: string
	symbol: string
	instrumentToken: string
	userId: string
	tradingsymbol: string
	averagePrice: number
	filledQuantity: number
	pendingQuantity: number
	totalTradedValue: number
	orderRefId: string
}

export interface GrowwMargin {
	equity: {
		enabled: boolean
		available: {
			cash: number
			collateral: number
			intraday_payin: number
		}
		utilised: {
			debt: number
			collateral: number
			m2m_realised: number
			m2m_unrealised: number
		}
	}
	commodity: {
		enabled: boolean
		available: {
			cash: number
			collateral: number
		}
		utilised: {
			debt: number
			collateral: number
		}
	}
}

export class GrowwSource implements MarketDataSource {
	private readonly httpGet: HttpGet
	private readonly httpPost?: (url: string, data?: any, options?: HttpGetOptions) => Promise<any>
	private readonly getAccessToken?: () => Promise<string | null>
	private readonly base: string
	private readonly apiKey: string
	private readonly appId: string

	// API endpoints based on official documentation
	private readonly endpoints = {
		// Live Data API
		quote: '/v1/live-data/quote',
		ltp: '/v1/live-data/ltp',
		marketData: '/v1/live-data/market-data',

		// Historical Data API
		historicalRange: '/v1/historical/candle/range',

		// Portfolio API
		holdings: '/v1/holdings/user',
		positions: '/v1/positions/user',
		orders: '/v1/orders',

		// Orders API
		placeOrder: '/v1/orders/place',
		modifyOrder: '/v1/orders/modify',
		cancelOrder: '/v1/orders/cancel',
		orderBook: '/v1/orders',
		orderHistory: '/v1/orders/history',

		// Margin API
		margin: '/v1/margins',

		// Instruments API
		instruments: '/v1/instruments',
		searchInstruments: '/v1/instruments/search',
		instrumentDetails: '/v1/instruments/details',
	}

	constructor(opts: GrowwSourceOptions) {
		this.httpGet = opts.httpGet
		this.httpPost = opts.httpPost
		this.getAccessToken = opts.getAccessToken
		this.base = opts.baseUrl || 'https://api.groww.in'
		this.apiKey = opts.apiKey || ''
		this.appId = opts.appId || ''
	}

	private async headers(): Promise<Record<string, string>> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'X-API-VERSION': '1.0',
			'User-Agent': 'StockPlay-Backend/1.0',
		}

		// Add API key if provided
		if (this.apiKey) {
			headers['X-API-KEY'] = this.apiKey
		}

		// Add App ID if provided
		if (this.appId) {
			headers['X-APP-ID'] = this.appId
		}

		// Add access token if available
		const token = (await this.getAccessToken?.()) || ''
		if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}

		return headers
	}

	private toIso(v: any): string {
		if (typeof v === 'number') {
			const ms = v < 1e12 ? v * 1000 : v
			return new Date(ms).toISOString()
		}
		if (typeof v === 'string') {
			if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString()
			if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString()
			const parsed = Date.parse(v)
			if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
		}
		return new Date().toISOString()
	}

	private fmtIst(d: Date) {
		const utc = d.getTime() + d.getTimezoneOffset() * 60000
		const ist = new Date(utc + 5.5 * 3600 * 1000)
		const pad = (n: number) => String(n).padStart(2, '0')
		const y = ist.getUTCFullYear()
		const m = pad(ist.getUTCMonth() + 1)
		const day = pad(ist.getUTCDate())
		const h = pad(ist.getUTCHours())
		const min = pad(ist.getUTCMinutes())
		const s = pad(ist.getUTCSeconds())
		return `${y}-${m}-${day} ${h}:${min}:${s}`
	}

	private parseAnyToDate(v?: string): Date | null {
		if (v == null) return null
		const trimmed = v.trim()
		if (/^\d{10}$/.test(trimmed)) return new Date(Number(trimmed) * 1000)
		if (/^\d{13}$/.test(trimmed)) return new Date(Number(trimmed))
		const t = Date.parse(trimmed)
		if (!Number.isNaN(t)) return new Date(t)
		if (/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(trimmed)) return new Date(trimmed.replace(' ', 'T') + 'Z')
		return null
	}

	private getIntervalLimits(intervalMinutes?: number): { maxDays?: number; availMonths?: number | 'full' } {
		switch (intervalMinutes) {
			case 1:
				return { maxDays: 7, availMonths: 3 }
			case 5:
				return { maxDays: 15, availMonths: 3 }
			case 10:
				return { maxDays: 30, availMonths: 3 }
			case 60:
				return { maxDays: 150, availMonths: 3 }
			case 240:
				return { maxDays: 365, availMonths: 3 }
			case 1440:
				return { maxDays: 1080, availMonths: 'full' }
			case 10080:
				return { maxDays: undefined, availMonths: 'full' }
			default:
				return { maxDays: undefined, availMonths: 3 }
		}
	}

	private clampRangeByLimits(from?: string, to?: string, intervalMinutes?: number): { start: string; end: string } {
		const now = new Date()
		const utcNow = now.getTime() + now.getTimezoneOffset() * 60000
		const istNow = new Date(utcNow + 5.5 * 3600 * 1000)

		const defaultFrom = new Date(istNow)
		defaultFrom.setUTCHours(9, 15, 0, 0)

		let fromDate = this.parseAnyToDate(from) ?? defaultFrom
		let toDate = this.parseAnyToDate(to) ?? istNow

		if (fromDate > toDate) {
			const tmp = fromDate
			fromDate = toDate
			toDate = tmp
		}

		const { maxDays, availMonths } = this.getIntervalLimits(intervalMinutes)

		if (availMonths !== 'full') {
			const earliest = new Date(istNow)
			earliest.setUTCDate(earliest.getUTCDate() - (availMonths ?? 3) * 30)
			if (fromDate < earliest) fromDate = earliest
		}

		if (typeof maxDays === 'number') {
			const maxMs = maxDays * 24 * 3600 * 1000
			const span = toDate.getTime() - fromDate.getTime()
			if (span > maxMs) {
				fromDate = new Date(toDate.getTime() - maxMs)
			}
		}

		return { start: this.fmtIst(fromDate), end: this.fmtIst(toDate) }
	}

	private async request(url: string, options: HttpGetOptions): Promise<any> {
		const headers = await this.headers()
		const merged: HttpGetOptions = { ...(options || {}), headers: { ...(options?.headers || {}), ...headers } }
		return this.httpGet(url, merged)
	}

	// Live Data API Methods
	async getQuote(symbol: string): Promise<Quote> {
		const url = `${this.base}${this.endpoints.quote}`
		const data = await this.request(url, {
			params: { trading_symbol: symbol, exchange: 'NSE', segment: 'CASH' },
		})

		// Docs: { status, payload: { last_price, last_trade_time, ohlc: { open, high, low, close }, ... } }
		const payload = data?.payload || data
		const ohlc = payload?.ohlc || {}

		return {
			symbol,
			priceCents: Math.round(Number(payload.last_price ?? payload.ltp ?? 0) * 100),
			asOf: this.toIso(payload.last_trade_time || payload.lastTradeTime || payload.timestamp || Date.now()),
			source: 'groww',
			openCents: ohlc.open != null ? Math.round(Number(ohlc.open) * 100) : undefined,
			highCents: ohlc.high != null ? Math.round(Number(ohlc.high) * 100) : undefined,
			lowCents: ohlc.low != null ? Math.round(Number(ohlc.low) * 100) : undefined,
			prevCloseCents: ohlc.close != null ? Math.round(Number(ohlc.close) * 100) : undefined,
		}
	}

	async getLtp(symbols: string[]): Promise<Map<string, number>> {
		const url = `${this.base}${this.endpoints.ltp}`
		const data = await this.request(url, {
			params: { symbols: symbols.join(',') },
		})

		const ltpMap = new Map<string, number>()
		const quotes = Array.isArray(data) ? data : [data]

		for (const quote of quotes) {
			if (quote.symbol && quote.ltp) {
				ltpMap.set(quote.symbol, Number(quote.ltp))
			}
		}

		return ltpMap
	}

	async getMarketData(symbols: string[]): Promise<any[]> {
		const url = `${this.base}${this.endpoints.marketData}`
		const data = await this.request(url, {
			params: { symbols: symbols.join(',') },
		})

		return Array.isArray(data) ? data : [data]
	}

	// Historical Data API Methods
	async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<Candle[]> {
		const url = `${this.base}${this.endpoints.historicalRange}`

		// Convert interval to Groww format
		const interval = this.mapInterval(intervalMinutes)

		// Groww expects: trading_symbol, exchange, segment, interval, start_time, end_time
		const { start, end } = this.clampRangeByLimits(from, to, intervalMinutes)
		const params: any = {
			trading_symbol: symbol,
			exchange: 'NSE',
			segment: 'CASH',
			interval,
			start_time: start,
			end_time: end,
		}

		const data = await this.request(url, { params })

		// { status, payload: { candles: [[ts, o, h, l, c, v], ...] } }
		const candles = data?.payload?.candles || data?.candles || []

		return candles.map((candle: any) => ({
			time: this.toIso(candle[0]),
			open: Number(candle[1]),
			high: Number(candle[2]),
			low: Number(candle[3]),
			close: Number(candle[4]),
			volume: Number(candle[5] || 0),
		}))
	}

	private mapInterval(intervalMinutes?: number): string {
		switch (intervalMinutes) {
			case 1: return '1m'
			case 5: return '5m'
			case 10: return '10m'
			case 15: return '15m'
			case 30: return '30m'
			case 60: return '1h'
			case 240: return '4h'
			case 1440: return '1d'
			case 10080: return '1w'
			default: return '1d'
		}
	}

	// Portfolio API Methods
	async getHoldings(): Promise<GrowwHolding[]> {
		const url = `${this.base}${this.endpoints.holdings}`
		const data = await this.request(url, {})

		// Docs: { status, payload: { holdings: [ { trading_symbol, quantity, average_price, ... } ] } }
		const holdings = data?.payload?.holdings || []

		return holdings.map((h: any) => ({
			symbol: h.trading_symbol || h.symbol || '',
			quantity: Number(h.quantity ?? 0),
			avgCostPrice: Number(h.average_price ?? 0),
			avgPrice: Number(h.average_price ?? 0),
			ltp: Number(h.ltp ?? 0),
			currentPrice: Number(h.ltp ?? 0),
			product: h.product || '',
			exchange: h.exchange || '',
			instrumentToken: h.instrument_token || h.symbol_isin || h.isin || '',
		}))
	}

	async getPositions(): Promise<any[]> {
		const url = `${this.base}${this.endpoints.positions}`
		const data = await this.request(url, {})

		// Docs: { status, payload: { positions: [ ... ] } }
		return data?.payload?.positions || []
	}

	async getOrders(): Promise<GrowwOrder[]> {
		const tryPaths = [this.endpoints.orders, '/v1/orders/user']
		let data: any = null
		for (const p of tryPaths) {
			try {
				const url = `${this.base}${p}`
				data = await this.request(url, {})
				if (data) break
			} catch (e: any) {
				// try next
			}
		}

		const orders = data?.payload?.orders || data?.orders || []
		return orders.map((order: any) => ({
			orderId: order.orderId,
			orderTimestamp: order.orderTimestamp,
			exchangeOrderId: order.exchangeOrderId,
			parentOrderId: order.parentOrderId ?? null,
			status: order.status,
			statusMessage: order.statusMessage,
			orderType: order.orderType,
			price: Number(order.price ?? 0),
			quantity: Number(order.quantity ?? 0),
			disclosedQuantity: Number(order.disclosedQuantity ?? 0),
			duration: order.duration,
			product: order.product,
			orderSide: order.orderSide,
			exchange: order.exchange,
			symbol: order.symbol || order.trading_symbol,
			instrumentToken: order.instrumentToken || order.instrument_token,
			userId: order.userId,
			tradingsymbol: order.tradingsymbol || order.trading_symbol,
			averagePrice: Number(order.averagePrice ?? 0),
			filledQuantity: Number(order.filledQuantity ?? 0),
			pendingQuantity: Number(order.pendingQuantity ?? 0),
			totalTradedValue: Number(order.totalTradedValue ?? 0),
			orderRefId: order.orderRefId,
		}))
	}

	// Orders API Methods
	async placeOrder(orderParams: {
		symbol: string
		exchange: string
		orderType: string
		orderSide: string
		quantity: number
		price?: number
		product?: string
		duration?: string
		disclosedQuantity?: number
		triggerPrice?: number
	}): Promise<any> {
		if (!this.httpPost) {
			throw new Error('HTTP POST method not provided')
		}

		const url = `${this.base}${this.endpoints.placeOrder}`
		const orderData = {
			symbol: orderParams.symbol,
			exchange: orderParams.exchange,
			orderType: orderParams.orderType,
			orderSide: orderParams.orderSide,
			quantity: orderParams.quantity,
			price: orderParams.price,
			product: orderParams.product || 'CNC',
			duration: orderParams.duration || 'DAY',
			disclosedQuantity: orderParams.disclosedQuantity,
			triggerPrice: orderParams.triggerPrice,
		}

		const data = await this.requestPost(url, orderData)

		// According to Groww API docs, response should include order details
		return data
	}

	async modifyOrder(orderId: string, modifications: {
		quantity?: number
		price?: number
		triggerPrice?: number
		orderType?: string
		duration?: string
	}): Promise<any> {
		if (!this.httpPost) {
			throw new Error('HTTP POST method not provided')
		}

		const url = `${this.base}${this.endpoints.modifyOrder}`
		const data = await this.requestPost(url, {
			orderId,
			...modifications,
		})

		return data
	}

	async cancelOrder(orderId: string): Promise<any> {
		if (!this.httpPost) {
			throw new Error('HTTP POST method not provided')
		}

		const url = `${this.base}${this.endpoints.cancelOrder}`
		const data = await this.requestPost(url, { orderId })

		return data
	}

	async getOrderBook(): Promise<GrowwOrder[]> {
		const url = `${this.base}${this.endpoints.orderBook}`
		const data = await this.request(url, {})

		const orders = data?.orders || []
		return this.mapOrders(orders)
	}

	async getOrderHistory(fromDate?: string, toDate?: string): Promise<GrowwOrder[]> {
		const url = `${this.base}${this.endpoints.orderHistory}`
		const params: any = {}
		if (fromDate) params.from = fromDate
		if (toDate) params.to = toDate

		const data = await this.request(url, { params })
		const orders = data?.orders || []
		return this.mapOrders(orders)
	}

	private mapOrders(orders: any[]): GrowwOrder[] {
		return orders.map((order: any) => ({
			orderId: order.orderId,
			orderTimestamp: order.orderTimestamp,
			exchangeOrderId: order.exchangeOrderId,
			parentOrderId: order.parentOrderId,
			status: order.status,
			statusMessage: order.statusMessage,
			orderType: order.orderType,
			price: Number(order.price),
			quantity: Number(order.quantity),
			disclosedQuantity: Number(order.disclosedQuantity),
			duration: order.duration,
			product: order.product,
			orderSide: order.orderSide,
			exchange: order.exchange,
			symbol: order.symbol,
			instrumentToken: order.instrumentToken,
			userId: order.userId,
			tradingsymbol: order.tradingsymbol,
			averagePrice: Number(order.averagePrice),
			filledQuantity: Number(order.filledQuantity),
			pendingQuantity: Number(order.pendingQuantity),
			totalTradedValue: Number(order.totalTradedValue),
			orderRefId: order.orderRefId,
		}))
	}

	// Margin API Methods
	async getMargin(): Promise<GrowwMargin> {
		const tryPaths = [this.endpoints.margin, '/v1/margins/user']
		let data: any = null
		for (const p of tryPaths) {
			try {
				const url = `${this.base}${p}`
				data = await this.request(url, {})
				if (data) break
			} catch (e: any) {}
		}

		// According to Groww API docs, response should include equity and commodity margins
		return {
			equity: {
				enabled: data.equity?.enabled || false,
				available: {
					cash: Number(data.equity?.available?.cash || 0),
					collateral: Number(data.equity?.available?.collateral || 0),
					intraday_payin: Number(data.equity?.available?.intraday_payin || 0),
				},
				utilised: {
					debt: Number(data.equity?.utilised?.debt || 0),
					collateral: Number(data.equity?.utilised?.collateral || 0),
					m2m_realised: Number(data.equity?.utilised?.m2m_realised || 0),
					m2m_unrealised: Number(data.equity?.utilised?.m2m_unrealised || 0),
				},
			},
			commodity: {
				enabled: data.commodity?.enabled || false,
				available: {
					cash: Number(data.commodity?.available?.cash || 0),
					collateral: Number(data.commodity?.available?.collateral || 0),
				},
				utilised: {
					debt: Number(data.commodity?.utilised?.debt || 0),
					collateral: Number(data.commodity?.utilised?.collateral || 0),
				},
			},
		}
	}

	// Instruments API Methods
	async searchInstruments(query: string, exchange?: string): Promise<any[]> {
		const primary = `${this.base}${this.endpoints.searchInstruments}`
		const fallback = `${this.base}/v1/instruments`
		const params: any = { q: query, query }
		if (exchange) params.exchange = exchange
		let data: any = null
		try {
			data = await this.request(primary, { params })
		} catch (e: any) {
			try {
				data = await this.request(fallback, { params })
			} catch {}
		}
		return data?.payload?.instruments || data?.instruments || data?.results || []
	}

	async getInstrumentsMaster(exchange?: string, segment?: string): Promise<any[]> {
		const url = `${this.base}${this.endpoints.instruments}`
		const params: any = {}
		if (exchange) params.exchange = exchange
		if (segment) params.segment = segment

		const data = await this.request(url, { params })

		// According to Groww API docs, response should include instrument master data
		return data?.instruments || []
	}

	async getInstrumentDetails(instrumentToken: string): Promise<any> {
		const url = `${this.base}${this.endpoints.instrumentDetails}`
		const data = await this.request(url, {
			params: { instrumentToken },
		})

		// According to Groww API docs, response should include detailed instrument information
		return data?.instrument || data
	}

	// Helper method for POST requests
	private async requestPost(url: string, data: any, options: HttpGetOptions = {}): Promise<any> {
		if (!this.httpPost) {
			throw new Error('HTTP POST method not provided')
		}

		const headers = await this.headers()
		const mergedOptions = {
			...options,
			headers: { ...(options.headers || {}), ...headers },
		}

		return this.httpPost(url, data, mergedOptions)
	}
} 