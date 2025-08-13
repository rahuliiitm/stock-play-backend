import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { QuotesProvider, QuoteResult, CandleResult } from './provider.interface'
import { GrowwAuthService } from './groww-auth.service'

@Injectable()
export class GrowwProvider implements QuotesProvider {
  private readonly logger = new Logger(GrowwProvider.name)

  constructor(private readonly http: HttpService, private readonly auth: GrowwAuthService) {}

  private baseUrl() {
    return process.env.GROWW_API_BASE || 'https://api.groww.in'
  }

  private exchange() {
    return process.env.GROWW_EXCHANGE || 'NSE'
  }

  private segment() {
    return process.env.GROWW_SEGMENT || 'CASH'
  }

  private quotePath() {
    return process.env.GROWW_QUOTE_PATH || '/v1/live-data/quote'
  }

  private historyPath() {
    return process.env.GROWW_HISTORY_PATH || '/v1/historical/candle/range'
  }

  private async headers() {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-API-VERSION': '1.0',
    }
    const token = await this.auth.getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  private mapSymbol(symbol: string) {
    return symbol
  }

  async getQuote(symbol: string): Promise<QuoteResult> {
    const s = this.mapSymbol(symbol)
    const url = `${this.baseUrl()}${this.quotePath()}`
    try {
      const { data } = await this.http.axiosRef.get(url, {
        headers: await this.headers(),
        params: { exchange: this.exchange(), segment: this.segment(), trading_symbol: s },
      })
      const payload = data?.payload ?? {}
      const ltp = payload.last_price ?? payload.ltp ?? payload.average_price
      const tsRaw = payload.last_trade_time ?? payload.timestamp
      const ts = typeof tsRaw === 'number' ? new Date(tsRaw).toISOString() : tsRaw ? new Date(tsRaw).toISOString() : new Date().toISOString()
      return { symbol, priceCents: Math.round(Number(ltp) * 100), asOf: ts, source: 'groww' }
    } catch (e: any) {
      const status = e?.response?.status
      const respData = e?.response?.data
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww quote error: ${url} status=${status} msg=${msg} data=${typeof respData === 'string' ? respData : JSON.stringify(respData)}`)
      throw e
    }
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

    // Defaults: today 09:15 IST to now IST
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

    // Apply availability window
    if (availMonths !== 'full') {
      const earliest = new Date(istNow)
      earliest.setUTCDate(earliest.getUTCDate() - (availMonths ?? 3) * 30)
      if (fromDate < earliest) fromDate = earliest
    }

    // Apply max span
    if (typeof maxDays === 'number') {
      const maxMs = maxDays * 24 * 3600 * 1000
      const span = toDate.getTime() - fromDate.getTime()
      if (span > maxMs) {
        fromDate = new Date(toDate.getTime() - maxMs)
      }
    }

    return { start: this.fmtIst(fromDate), end: this.fmtIst(toDate) }
  }

  async getHistory(symbol: string, from?: string, to?: string, intervalMinutes?: number): Promise<CandleResult[]> {
    const s = this.mapSymbol(symbol)
    const url = `${this.baseUrl()}${this.historyPath()}`
    const { start, end } = this.clampRangeByLimits(from, to, intervalMinutes)
    try {
      const { data } = await this.http.axiosRef.get(url, {
        headers: await this.headers(),
        params: {
          exchange: this.exchange(),
          segment: this.segment(),
          trading_symbol: s,
          start_time: start,
          end_time: end,
          ...(intervalMinutes ? { interval_in_minutes: intervalMinutes } : {}),
        },
      })

      let rows: any = null
      if (Array.isArray(data?.payload?.candles)) rows = data.payload.candles
      else if (Array.isArray(data?.payload?.data)) rows = data.payload.data
      else if (Array.isArray(data?.payload)) rows = data.payload
      else if (Array.isArray(data?.candles)) rows = data.candles
      else if (Array.isArray(data)) rows = data

      if (!Array.isArray(rows)) {
        this.logger.warn(`Groww history payload not array for ${symbol}. Keys=${Object.keys(data || {}).join(',')}`)
        return []
      }

      const toIso = (v: any): string => {
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

      const candles = rows.map((c: any) => ({
        time: toIso(c[0] ?? c.time ?? c.t),
        open: Number(c[1] ?? c.open ?? c.o),
        high: Number(c[2] ?? c.high ?? c.h),
        low: Number(c[3] ?? c.low ?? c.l),
        close: Number(c[4] ?? c.close ?? c.c),
        volume: Number(c[5] ?? c.volume ?? c.v ?? 0),
      }))
      return candles
    } catch (e: any) {
      const status = e?.response?.status
      const respData = e?.response?.data
      const msg = e?.message || 'unknown error'
      this.logger.error(`Groww history error: ${url} status=${status} msg=${msg} data=${typeof respData === 'string' ? respData : JSON.stringify(respData)}`)
      return []
    }
  }
} 