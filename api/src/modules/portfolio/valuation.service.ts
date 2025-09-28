import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holding } from '../../entities/Holding.entity';
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity';
import { QuotesService } from '../stocks/quotes.service';
import { HoldingsService } from './holdings.service';
import { getRedis } from '../../lib/redis';

export interface PortfolioValuation {
  marketValueCents: number;
  investedCents: number;
  pnlCents: number;
  returnPercent: number;
  holdings: Array<{
    symbol: string;
    quantity: number;
    avgCostCents: number;
    currentPriceCents: number;
    marketValueCents: number;
    pnlCents: number;
    exchange: string;
  }>;
}

export interface CachedQuote {
  price: number;
  timestamp: number;
  source: string;
}

@Injectable()
export class ValuationService {
  private readonly logger = new Logger(ValuationService.name);
  private readonly QUOTE_CACHE_TTL = 60; // 1 minute
  private readonly PORTFOLIO_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Holding)
    private readonly holdings: Repository<Holding>,
    @InjectRepository(PortfolioSnapshotV2)
    private readonly snapshots: Repository<PortfolioSnapshotV2>,
    private readonly quotes: QuotesService,
    private readonly holdingsService: HoldingsService,
  ) {}

  private getRedisClient() {
    const redis = getRedis();
    if (!redis) {
      this.logger.warn('Redis not available, using in-memory cache');
      return null;
    }
    return redis;
  }

  private getQuoteCacheKey(symbol: string): string {
    return `quote:${symbol}`;
  }

  private getPortfolioCacheKey(portfolioId: string): string {
    return `valuation:${portfolioId}`;
  }

  async getCachedQuote(symbol: string): Promise<CachedQuote | null> {
    const redis = this.getRedisClient();
    if (!redis) return null;

    try {
      const cached = await redis.get(this.getQuoteCacheKey(symbol));
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp > this.QUOTE_CACHE_TTL * 1000) {
        // Cache expired
        await redis.del(this.getQuoteCacheKey(symbol));
        return null;
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Error getting cached quote for ${symbol}:`, error);
      return null;
    }
  }

  async setCachedQuote(symbol: string, quote: CachedQuote): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) return;

    try {
      await redis.setex(
        this.getQuoteCacheKey(symbol),
        this.QUOTE_CACHE_TTL,
        JSON.stringify(quote),
      );
    } catch (error) {
      this.logger.error(`Error setting cached quote for ${symbol}:`, error);
    }
  }

  async getCachedPortfolioValuation(
    portfolioId: string,
  ): Promise<PortfolioValuation | null> {
    const redis = this.getRedisClient();
    if (!redis) return null;

    try {
      const cached = await redis.get(this.getPortfolioCacheKey(portfolioId));
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp > this.PORTFOLIO_CACHE_TTL * 1000) {
        // Cache expired
        await redis.del(this.getPortfolioCacheKey(portfolioId));
        return null;
      }

      return parsed.data;
    } catch (error) {
      this.logger.error(
        `Error getting cached portfolio valuation for ${portfolioId}:`,
        error,
      );
      return null;
    }
  }

  async setCachedPortfolioValuation(
    portfolioId: string,
    valuation: PortfolioValuation,
  ): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) return;

    try {
      const cacheData = {
        data: valuation,
        timestamp: Date.now(),
      };
      await redis.setex(
        this.getPortfolioCacheKey(portfolioId),
        this.PORTFOLIO_CACHE_TTL,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      this.logger.error(
        `Error setting cached portfolio valuation for ${portfolioId}:`,
        error,
      );
    }
  }

  async getQuote(symbol: string): Promise<{ price: number; source: string }> {
    // Try cache first
    const cached = await this.getCachedQuote(symbol);
    if (cached) {
      return { price: cached.price, source: cached.source };
    }

    // Fetch fresh quote
    const quote = await this.quotes.getQuote(symbol);

    // Cache the result
    await this.setCachedQuote(symbol, {
      price: quote.price,
      timestamp: Date.now(),
      source: quote.source,
    });

    return { price: quote.price, source: quote.source };
  }

  async getBulkQuotes(
    symbols: string[],
  ): Promise<Map<string, { price: number; source: string }>> {
    const results = new Map<string, { price: number; source: string }>();
    const uncachedSymbols: string[] = [];

    // Check cache for all symbols
    for (const symbol of symbols) {
      const cached = await this.getCachedQuote(symbol);
      if (cached) {
        results.set(symbol, { price: cached.price, source: cached.source });
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch uncached quotes in parallel
    if (uncachedSymbols.length > 0) {
      const quotePromises = uncachedSymbols.map(async (symbol) => {
        try {
          const quote = await this.quotes.getQuote(symbol);
          return { symbol, quote };
        } catch (error) {
          this.logger.error(`Error fetching quote for ${symbol}:`, error);
          return { symbol, quote: null };
        }
      });

      const quoteResults = await Promise.all(quotePromises);

      for (const { symbol, quote } of quoteResults) {
        if (quote) {
          results.set(symbol, { price: quote.price, source: quote.source });

          // Cache the result
          await this.setCachedQuote(symbol, {
            price: quote.price,
            timestamp: Date.now(),
            source: quote.source,
          });
        }
      }
    }

    return results;
  }

  async calculatePortfolioValuation(
    portfolioId: string,
  ): Promise<PortfolioValuation | null> {
    // Try cache first
    const cached = await this.getCachedPortfolioValuation(portfolioId);
    if (cached) {
      return cached;
    }

    // Get portfolio holdings
    const holdings = await this.holdings.find({
      where: { portfolioId: portfolioId },
    });
    if (holdings.length === 0) {
      const emptyValuation: PortfolioValuation = {
        marketValueCents: 0,
        investedCents: 0,
        pnlCents: 0,
        returnPercent: 0,
        holdings: [],
      };
      await this.setCachedPortfolioValuation(portfolioId, emptyValuation);
      return emptyValuation;
    }

    // Get unique symbols
    const symbols = [...new Set(holdings.map((h) => h.symbol))];

    // Get quotes for all symbols
    const quotesMap = await this.getBulkQuotes(symbols);

    let totalInvestedCents = 0;
    let totalMarketValueCents = 0;
    const holdingsMetrics: PortfolioValuation['holdings'] = [];

    for (const holding of holdings) {
      const quantity = Number(holding.quantity);
      const avgCostCents = holding.avg_cost;

      const quote = quotesMap.get(holding.symbol);
      if (quote) {
        const currentPriceCents = quote.price;
        const marketValueCents = Math.round(currentPriceCents * quantity);
        const investedCents = Math.round(avgCostCents * quantity);
        const pnlCents = marketValueCents - investedCents;

        totalInvestedCents += investedCents;
        totalMarketValueCents += marketValueCents;

        holdingsMetrics.push({
          symbol: holding.symbol,
          quantity,
          avgCostCents,
          currentPriceCents,
          marketValueCents,
          pnlCents,
          exchange: holding.exchange,
        });
      } else {
        // Use last known value if quote unavailable
        const marketValueCents = holding.current_value;
        const investedCents = Math.round(avgCostCents * quantity);
        const pnlCents = marketValueCents - investedCents;

        totalInvestedCents += investedCents;
        totalMarketValueCents += marketValueCents;

        holdingsMetrics.push({
          symbol: holding.symbol,
          quantity,
          avgCostCents,
          currentPriceCents: holding.current_value,
          marketValueCents,
          pnlCents,
          exchange: holding.exchange,
        });
      }
    }

    const pnlCents = totalMarketValueCents - totalInvestedCents;
    const returnPercent =
      totalInvestedCents > 0
        ? Number(((pnlCents / totalInvestedCents) * 100).toFixed(4))
        : 0;

    const valuation: PortfolioValuation = {
      marketValueCents: totalMarketValueCents,
      investedCents: totalInvestedCents,
      pnlCents,
      returnPercent,
      holdings: holdingsMetrics,
    };

    // Cache the result
    await this.setCachedPortfolioValuation(portfolioId, valuation);

    return valuation;
  }

  async createPortfolioSnapshot(
    portfolioId: string,
    date: Date,
  ): Promise<PortfolioSnapshotV2 | null> {
    const valuation = await this.calculatePortfolioValuation(portfolioId);
    if (!valuation) return null;

    const snapshot = this.snapshots.create({
      portfolioId: portfolioId,
      date,
      market_value: valuation.marketValueCents,
      invested: valuation.investedCents,
      pnl: valuation.pnlCents,
      return_percent: valuation.returnPercent,
    });

    return this.snapshots.save(snapshot);
  }

  async getPortfolioHistory(
    portfolioId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PortfolioSnapshotV2[]> {
    const query = this.snapshots
      .createQueryBuilder('snapshot')
      .where('snapshot.portfolioId = :portfolioId', { portfolioId })
      .orderBy('snapshot.date', 'ASC');

    if (startDate) {
      query.andWhere('snapshot.date >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('snapshot.date <= :endDate', { endDate });
    }

    return query.getMany();
  }

  async invalidatePortfolioCache(portfolioId: string): Promise<void> {
    const redis = this.getRedisClient();
    if (redis) {
      try {
        await redis.del(this.getPortfolioCacheKey(portfolioId));
      } catch (error) {
        this.logger.error(
          `Error invalidating portfolio cache for ${portfolioId}:`,
          error,
        );
      }
    }
  }

  async invalidateQuoteCache(symbol: string): Promise<void> {
    const redis = this.getRedisClient();
    if (redis) {
      try {
        await redis.del(this.getQuoteCacheKey(symbol));
      } catch (error) {
        this.logger.error(
          `Error invalidating quote cache for ${symbol}:`,
          error,
        );
      }
    }
  }

  async getCacheStats(): Promise<{
    quotesCached: number;
    portfoliosCached: number;
    redisConnected: boolean;
  }> {
    const redis = this.getRedisClient();
    if (!redis) {
      return { quotesCached: 0, portfoliosCached: 0, redisConnected: false };
    }

    try {
      // Get all keys matching our patterns
      const quoteKeys = await redis.keys('quote:*');
      const portfolioKeys = await redis.keys('valuation:*');

      return {
        quotesCached: quoteKeys.length,
        portfoliosCached: portfolioKeys.length,
        redisConnected: true,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { quotesCached: 0, portfoliosCached: 0, redisConnected: false };
    }
  }
}
