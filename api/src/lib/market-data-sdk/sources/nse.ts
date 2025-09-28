import type { Candle, Quote } from '../models';
import type { HttpGet, HttpGetOptions, MarketDataSource } from '../source';

export interface NseSourceOptions {
  httpGet: HttpGet;
  baseUrl?: string;
  quotePath?: string;
  historyDailyPath?: string;
  defaultHeaders?: Record<string, string>;
}

export class NseSource implements MarketDataSource {
  private readonly httpGet: HttpGet;
  private readonly base: string;
  private readonly quote: string;
  private readonly historyDaily: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(opts: NseSourceOptions) {
    this.httpGet = opts.httpGet;
    this.base = opts.baseUrl || 'https://nse.example.com';
    this.quote = opts.quotePath || '/api/quote';
    this.historyDaily = opts.historyDailyPath || '/api/history';
    this.defaultHeaders = opts.defaultHeaders || {};
  }

  private async request(
    url: string,
    options: HttpGetOptions = {},
  ): Promise<any> {
    const headers = { ...(options.headers || {}), ...this.defaultHeaders };
    return this.httpGet(url, { ...options, headers });
  }

  private toIso(v: any): string {
    if (typeof v === 'number') {
      const ms = v < 1e12 ? v * 1000 : v;
      return new Date(ms).toISOString();
    }
    if (typeof v === 'string') {
      if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
      if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
      const parsed = Date.parse(v);
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    }
    return new Date().toISOString();
  }

  async getQuote(symbol: string): Promise<Quote> {
    const url = `${this.base}${this.quote}`;
    try {
      const data = await this.request(url, { params: { symbol } });
      const last = Number(
        data?.lastPrice ??
          data?.ltp ??
          data?.price ??
          data?.payload?.last_price ??
          0,
      );
      const ts = this.toIso(
        data?.timestamp ??
          data?.lastTradeTime ??
          data?.payload?.timestamp ??
          Date.now(),
      );
      return { symbol, price: last, asOf: ts, source: 'nse' };
    } catch {
      // Conservative fallback
      return {
        symbol,
        price: 0,
        asOf: new Date().toISOString(),
        source: 'nse',
      };
    }
  }

  async getHistory(
    symbol: string,
    from?: string,
    to?: string,
    _intervalMinutes?: number,
  ): Promise<Candle[]> {
    // Focus on daily history; provider should pass 1440. We ignore interval and fetch daily.
    const url = `${this.base}${this.historyDaily}`;
    const params: Record<string, any> = { symbol };
    if (from) params.from = from;
    if (to) params.to = to;
    try {
      const data = await this.request(url, { params });
      let rows: any = null;
      if (Array.isArray(data?.payload?.candles)) rows = data.payload.candles;
      else if (Array.isArray(data?.payload?.data)) rows = data.payload.data;
      else if (Array.isArray(data?.candles)) rows = data.candles;
      else if (Array.isArray(data?.data)) rows = data.data;
      else if (Array.isArray(data)) rows = data;

      if (!Array.isArray(rows)) return [];

      // Accept array forms: [time, o, h, l, c, v] or object shape
      const candles: Candle[] = rows.map((c: any) => ({
        time: this.toIso(c[0] ?? c.time ?? c.t),
        open: Number(c[1] ?? c.open ?? c.o),
        high: Number(c[2] ?? c.high ?? c.h),
        low: Number(c[3] ?? c.low ?? c.l),
        close: Number(c[4] ?? c.close ?? c.c),
        volume: Number(c[5] ?? c.volume ?? c.v ?? 0),
      }));
      return candles;
    } catch {
      return [];
    }
  }
}
