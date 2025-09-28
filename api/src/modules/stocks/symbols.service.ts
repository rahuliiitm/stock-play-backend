import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockSymbol } from '../../entities/StockSymbol.entity';
import { HttpService } from '@nestjs/axios';

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(',').map((p) => p.replace(/^"|"$/g, '').trim()));
}

@Injectable()
export class SymbolsService {
  private readonly logger = new Logger(SymbolsService.name);

  constructor(
    @InjectRepository(StockSymbol)
    private readonly symbols: Repository<StockSymbol>,
    private readonly http: HttpService,
  ) {}

  private defaultSources() {
    const nse =
      process.env.NSE_SYMBOLS_URL ||
      'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
    const bse = process.env.BSE_SYMBOLS_URL || '';
    return { nse, bse };
  }

  async sync(nseUrl?: string, bseUrl?: string) {
    const sources: Array<{ url: string; exchange: 'NSE' | 'BSE' }> = [];
    const { nse, bse } = this.defaultSources();
    if (nseUrl || nse) sources.push({ url: nseUrl || nse, exchange: 'NSE' });
    if (bseUrl || bse) sources.push({ url: bseUrl || bse, exchange: 'BSE' });

    const batchAt = new Date();

    for (const s of sources) {
      try {
        if (!s.url) continue;
        const { data } = await this.http.axiosRef.get(s.url, {
          responseType: 'text',
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const rows = parseCsv(String(data));
        if (rows.length === 0) continue;
        const header = rows[0].map((h) => h.toUpperCase());
        const isNse = s.exchange === 'NSE';
        const isBse = s.exchange === 'BSE';
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const get = (name: string) => {
            const idx = header.indexOf(name);
            return idx >= 0 ? r[idx] : '';
          };

          if (isNse) {
            // NSE EQUITY_L.csv columns
            const symbol = (get('SYMBOL') || r[0] || '').toUpperCase();
            if (!symbol || symbol === 'SYMBOL') continue;
            const name = get('NAME OF COMPANY') || get('NAME') || null;
            const series = get('SERIES') || null;
            const isin = get('ISIN') || get('ISIN NUMBER') || null;
            const lot = get('MARKET LOT') || get('LOT SIZE') || '';
            const face = get('FACE VALUE') || '';
            await this.symbols
              .createQueryBuilder()
              .insert()
              .into(StockSymbol)
              .values({
                symbol,
                name,
                exchange: s.exchange,
                series,
                isin,
                lot_size: lot ? Number(lot) : null,
                face_value: face ? face : null,
                status: 'active',
                last_seen_at: batchAt,
              })
              .orUpdate(
                [
                  'name',
                  'series',
                  'isin',
                  'lot_size',
                  'face_value',
                  'status',
                  'last_seen_at',
                  'updated_at',
                ],
                ['symbol', 'exchange'],
              )
              .execute();
          } else if (isBse) {
            // BSE Bhavcopy CSV (direct CSV variant) columns e.g. TckrSymb, FinInstrmNm, SctySrs, ISIN
            const raw = (
              get('TCKRSYMB') ||
              get('SYMBOL') ||
              r[0] ||
              ''
            ).toUpperCase();
            const symbol = raw.replace(/[\s#]+/g, '');
            if (!symbol || symbol === 'TCKRSYMB') continue;
            const name =
              get('FININSTRMNM') ||
              get('SC_NAME') ||
              get('SCRIP NAME') ||
              symbol;
            const series = get('SCTYSRS') || null;
            const isin = get('ISIN') || null;
            await this.symbols
              .createQueryBuilder()
              .insert()
              .into(StockSymbol)
              .values({
                symbol,
                name,
                exchange: s.exchange,
                series,
                isin,
                status: 'active',
                last_seen_at: batchAt,
              })
              .orUpdate(
                [
                  'name',
                  'series',
                  'isin',
                  'status',
                  'last_seen_at',
                  'updated_at',
                ],
                ['symbol', 'exchange'],
              )
              .execute();
          }
        }
        // Mark delisted/inactive: anything not seen in this batch for this exchange
        await this.symbols
          .createQueryBuilder()
          .update(StockSymbol)
          .set({ status: 'inactive' as any })
          .where(
            'exchange = :ex AND (last_seen_at IS NULL OR last_seen_at < :batchAt)',
            { ex: s.exchange, batchAt },
          )
          .execute();
      } catch (e: any) {
        this.logger.warn(
          `Symbol sync failed for ${s.exchange}: ${e?.message || e}`,
        );
      }
    }
    return { ok: true };
  }

  async syncBseBhavcopy(zipUrl: string) {
    const batchAt = new Date();
    const { data } = await this.http.axiosRef.get(zipUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(Buffer.from(data));
    const entries = zip
      .getEntries()
      .filter((e: any) => e.entryName.toLowerCase().endsWith('.csv'));
    for (const e of entries) {
      const content = e.getData().toString('utf8');
      const rows = parseCsv(content);
      if (rows.length === 0) continue;
      const header = rows[0].map((h) => h.toUpperCase());
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const get = (name: string) => {
          const idx = header.indexOf(name);
          return idx >= 0 ? r[idx] : '';
        };
        const symbol = (
          get('SC_NAME') ||
          get('SCRIP NAME') ||
          get('SYMBOL') ||
          r[0] ||
          ''
        )
          .toUpperCase()
          .replace(/\s+/g, '');
        if (!symbol) continue;
        const name = get('SC_NAME') || get('SCRIP NAME') || symbol;
        const isin = get('ISIN') || null;
        await this.symbols
          .createQueryBuilder()
          .insert()
          .into(StockSymbol)
          .values({
            symbol,
            name,
            exchange: 'BSE',
            isin,
            status: 'active',
            last_seen_at: batchAt,
          })
          .orUpdate(
            ['name', 'isin', 'status', 'last_seen_at', 'updated_at'],
            ['symbol'],
          )
          .execute();
      }
      await this.symbols
        .createQueryBuilder()
        .update(StockSymbol)
        .set({ status: 'inactive' as any })
        .where(
          'exchange = :ex AND (last_seen_at IS NULL OR last_seen_at < :batchAt)',
          { ex: 'BSE', batchAt },
        )
        .execute();
    }
    return { ok: true };
  }

  async list(q?: string, exchange?: string) {
    const qb = this.symbols
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'active' });
    if (q && q.trim().length > 0)
      qb.andWhere('(s.symbol ILIKE :q OR s.name ILIKE :q)', { q: `%${q}%` });
    if (exchange) qb.andWhere('s.exchange = :ex', { ex: exchange });
    qb.orderBy('s.symbol', 'ASC').limit(200);
    return qb.getMany();
  }

  async get(symbol: string) {
    return this.symbols.findOne({ where: { symbol: symbol.toUpperCase() } });
  }
}
