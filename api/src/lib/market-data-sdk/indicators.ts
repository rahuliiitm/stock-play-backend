import type { Candle } from './models'

export function rsi(candles: Candle[], period = 14): number | null {
	if (candles.length < period + 1) return null
	let gains = 0
	let losses = 0
	for (let i = 1; i <= period; i++) {
		const diff = candles[i].close - candles[i - 1].close
		if (diff >= 0) gains += diff
		else losses -= diff
	}
	const rs = losses === 0 ? 100 : gains / (losses || 1)
	const value = 100 - 100 / (1 + rs)
	return Number(value.toFixed(2))
}

export function sma(candles: Candle[], period = 20): number | null {
	if (candles.length < period) return null
	const sum = candles.slice(-period).reduce((s, c) => s + c.close, 0)
	return Number((sum / period).toFixed(2))
}

export function macd(
	candles: Candle[],
	short = 12,
	long = 26,
	signal = 9,
): { macd: number; signal: number; histogram: number } | null {
	if (candles.length < long + signal) return null
	const ema = (arr: number[], p: number) => {
		const k = 2 / (p + 1)
		let prev = arr[0]
		for (let i = 1; i < arr.length; i++) prev = arr[i] * k + prev * (1 - k)
		return prev
	}
	const closes = candles.map((c) => c.close)
	const emaShort = ema(closes.slice(-long), short)
	const emaLong = ema(closes.slice(-long), long)
	const macdVal = emaShort - emaLong
	const signalLine = ema(closes.slice(-long), signal)
	const hist = macdVal - signalLine
	return { macd: Number(macdVal.toFixed(2)), signal: Number(signalLine.toFixed(2)), histogram: Number(hist.toFixed(2)) }
} 