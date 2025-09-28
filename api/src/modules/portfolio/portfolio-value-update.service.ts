import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioV2 } from '../../entities/PortfolioV2.entity';
import { Holding } from '../../entities/Holding.entity';
import { StockQuoteCacheService } from '../stocks/stock-quote-cache.service';
import { ValuationService } from './valuation.service';

@Injectable()
export class PortfolioValueUpdateService {
  private readonly logger = new Logger(PortfolioValueUpdateService.name);

  constructor(
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(Holding) private readonly holdings: Repository<Holding>,
    private readonly quoteCache: StockQuoteCacheService,
    private readonly valuation: ValuationService,
  ) {}

  /**
   * Update all portfolio values using cached quotes
   */
  async updateAllPortfolioValues(): Promise<void> {
    this.logger.log('Starting portfolio value update for all portfolios');

    const portfolios = await this.portfolios.find({
      relations: ['holdings'],
    });

    if (portfolios.length === 0) {
      this.logger.log('No portfolios to update');
      return;
    }

    // Get all unique symbols from all portfolios
    const allSymbols = new Set<string>();
    portfolios.forEach((portfolio) => {
      portfolio.holdings.forEach((holding) => {
        if (holding.symbol) {
          allSymbols.add(holding.symbol);
        }
      });
    });

    const symbols = Array.from(allSymbols);
    this.logger.log(
      `Found ${symbols.length} unique symbols across ${portfolios.length} portfolios`,
    );

    // Get all cached quotes at once
    const cachedQuotes = await this.quoteCache.getCachedQuotes(symbols);
    this.logger.log(`Retrieved ${cachedQuotes.size} cached quotes`);

    // Update each portfolio using cached quotes
    for (const portfolio of portfolios) {
      try {
        await this.updatePortfolioValueWithCache(portfolio.id, cachedQuotes);
      } catch (error) {
        this.logger.error(`Failed to update portfolio ${portfolio.id}:`, error);
      }
    }

    this.logger.log(
      `Completed portfolio value update for ${portfolios.length} portfolios`,
    );
  }

  /**
   * Update a specific portfolio's value using cached quotes
   */
  async updatePortfolioValue(portfolioId: string): Promise<void> {
    const portfolio = await this.portfolios.findOne({
      where: { id: portfolioId },
      relations: ['holdings'],
    });

    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // Get symbols for this portfolio
    const symbols = portfolio.holdings.map((h) => h.symbol).filter(Boolean);

    // Get cached quotes for these symbols
    const cachedQuotes = await this.quoteCache.getCachedQuotes(symbols);

    await this.updatePortfolioValueWithCache(portfolioId, cachedQuotes);
  }

  /**
   * Update portfolio value using provided cached quotes
   */
  private async updatePortfolioValueWithCache(
    portfolioId: string,
    cachedQuotes: Map<string, any>,
  ): Promise<void> {
    const portfolio = await this.portfolios.findOne({
      where: { id: portfolioId },
      relations: ['holdings'],
    });

    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    let totalValueCents = 0;
    const updatedHoldings: Holding[] = [];

    // Update each holding using cached quotes
    for (const holding of portfolio.holdings) {
      const cachedQuote = cachedQuotes.get(holding.symbol);

      if (cachedQuote) {
        const currentPrice = cachedQuote.price;
        const currentValue = Math.round(
          currentPrice * parseFloat(holding.quantity),
        );

        holding.current_value = currentValue;
        updatedHoldings.push(holding);
        totalValueCents += currentValue;

        this.logger.debug(
          `Updated holding ${holding.symbol}: ₹${currentValue} (cached)`,
        );
      } else {
        // Fallback to direct API call if not in cache
        try {
          const quote = await this.quoteCache.getQuote(holding.symbol);
          if (quote) {
            const currentPrice = quote.price;
            const currentValue = Math.round(
              currentPrice * parseFloat(holding.quantity),
            );

            holding.current_value = currentValue;
            updatedHoldings.push(holding);
            totalValueCents += currentValue;

            this.logger.debug(
              `Updated holding ${holding.symbol}: ₹${currentValue} (API)`,
            );
          } else {
            // Keep existing value if quote fetch fails
            totalValueCents += holding.current_value || 0;
            this.logger.warn(
              `No quote available for ${holding.symbol}, keeping existing value`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to get quote for ${holding.symbol}:`, error);
          // Keep existing value if quote fetch fails
          totalValueCents += holding.current_value || 0;
        }
      }
    }

    // Save updated holdings
    if (updatedHoldings.length > 0) {
      await this.holdings.save(updatedHoldings);
    }

    // Calculate return percentage
    const initialValue = portfolio.initial_value || 0;
    const returnPercent =
      initialValue > 0
        ? ((totalValueCents - initialValue) / initialValue) * 100
        : 0;

    // Update portfolio with new values
    portfolio.initial_value = initialValue;
    await this.portfolios.save(portfolio);

    // Invalidate cache
    await this.valuation.invalidatePortfolioCache(portfolioId);

    this.logger.log(
      `Updated portfolio ${portfolioId}: total value = ${totalValueCents} cents, return = ${returnPercent.toFixed(2)}%`,
    );
  }

  /**
   * Update portfolio values for public portfolios only
   */
  async updatePublicPortfolioValues(): Promise<void> {
    this.logger.log('Starting portfolio value update for public portfolios');

    const publicPortfolios = await this.portfolios.find({
      where: { visibility: 'public' },
      relations: ['holdings'],
    });

    if (publicPortfolios.length === 0) {
      this.logger.log('No public portfolios to update');
      return;
    }

    // Get all unique symbols from public portfolios
    const allSymbols = new Set<string>();
    publicPortfolios.forEach((portfolio) => {
      portfolio.holdings.forEach((holding) => {
        if (holding.symbol) {
          allSymbols.add(holding.symbol);
        }
      });
    });

    const symbols = Array.from(allSymbols);
    this.logger.log(
      `Found ${symbols.length} unique symbols across ${publicPortfolios.length} public portfolios`,
    );

    // Get all cached quotes at once
    const cachedQuotes = await this.quoteCache.getCachedQuotes(symbols);
    this.logger.log(`Retrieved ${cachedQuotes.size} cached quotes`);

    // Update each public portfolio using cached quotes
    for (const portfolio of publicPortfolios) {
      try {
        await this.updatePortfolioValueWithCache(portfolio.id, cachedQuotes);
      } catch (error) {
        this.logger.error(
          `Failed to update public portfolio ${portfolio.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Completed portfolio value update for ${publicPortfolios.length} public portfolios`,
    );
  }

  /**
   * Update portfolio values for a specific user
   */
  async updateUserPortfolioValues(userId: string): Promise<void> {
    this.logger.log(`Starting portfolio value update for user ${userId}`);

    const userPortfolios = await this.portfolios.find({
      where: { user_id: userId },
      relations: ['holdings'],
    });

    if (userPortfolios.length === 0) {
      this.logger.log(`No portfolios found for user ${userId}`);
      return;
    }

    // Get all unique symbols from user portfolios
    const allSymbols = new Set<string>();
    userPortfolios.forEach((portfolio) => {
      portfolio.holdings.forEach((holding) => {
        if (holding.symbol) {
          allSymbols.add(holding.symbol);
        }
      });
    });

    const symbols = Array.from(allSymbols);
    this.logger.log(
      `Found ${symbols.length} unique symbols across ${userPortfolios.length} user portfolios`,
    );

    // Get all cached quotes at once
    const cachedQuotes = await this.quoteCache.getCachedQuotes(symbols);
    this.logger.log(`Retrieved ${cachedQuotes.size} cached quotes`);

    // Update each user portfolio using cached quotes
    for (const portfolio of userPortfolios) {
      try {
        await this.updatePortfolioValueWithCache(portfolio.id, cachedQuotes);
      } catch (error) {
        this.logger.error(
          `Failed to update user portfolio ${portfolio.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Completed portfolio value update for ${userPortfolios.length} portfolios of user ${userId}`,
    );
  }

  /**
   * Update quotes for specific symbols (when new stocks are added)
   */
  async updateQuotesForSymbols(symbols: string[]): Promise<void> {
    this.logger.log(`Updating quotes for ${symbols.length} symbols`);
    await this.quoteCache.updateSymbolsQuotes(symbols);
  }

  /**
   * Clear cache for specific symbol (when stocks are removed)
   */
  async clearQuoteCache(symbol: string): Promise<void> {
    this.logger.log(`Clearing quote cache for symbol: ${symbol}`);
    await this.quoteCache.clearSymbolCache(symbol);
  }
}
