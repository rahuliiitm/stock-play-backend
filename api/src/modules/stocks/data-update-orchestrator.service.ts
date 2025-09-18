import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { StockQuoteCacheService } from './stock-quote-cache.service'
import { StockUniverseService } from './stock-universe.service'

export class DataUpdateEvent {
  constructor(
    public readonly type: 'quotes' | 'portfolio-values' | 'indicators',
    public readonly timestamp: Date,
    public readonly data?: any
  ) {}
}

export class QuoteUpdateEvent extends DataUpdateEvent {
  constructor(
    public readonly symbols: string[],
    public readonly quotes: Map<string, any>,
    timestamp: Date
  ) {
    super('quotes', timestamp, { symbols, quotes })
  }
}

@Injectable()
export class DataUpdateOrchestratorService {
  private readonly logger = new Logger(DataUpdateOrchestratorService.name)
  private isUpdating = false

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly quoteCache: StockQuoteCacheService,
    private readonly stockUniverse: StockUniverseService,
  ) {}

  /**
   * Main orchestrator - runs every hour instead of 5 minutes
   */
  @Cron(CronExpression.EVERY_HOUR)
  async orchestrateDataUpdate(): Promise<void> {
    if (this.isUpdating) {
      this.logger.warn('Data update already in progress, skipping')
      return
    }

    this.isUpdating = true
    const startTime = new Date()

    try {
      this.logger.log('Starting coordinated data update pipeline')

      // Step 1: Update stock quotes
      await this.updateStockQuotes()

      // Step 2: Emit event for portfolio value updates
      await this.triggerPortfolioValueUpdate()


      // Step 4: Emit event for indicator calculations
      await this.triggerIndicatorCalculation()

      const duration = Date.now() - startTime.getTime()
      this.logger.log(`Data update pipeline completed in ${duration}ms`)

    } catch (error) {
      this.logger.error('Data update pipeline failed:', error)
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * Update stock quotes and emit event
   */
  private async updateStockQuotes(): Promise<void> {
    this.logger.log('Updating stock quotes...')
    
    // Get all active symbols from universe (not just portfolio holdings)
    const allSymbols = await this.stockUniverse.getActiveSymbols()
    const symbols = allSymbols.map(s => s.symbol)

    // Update quotes for all symbols
    await this.quoteCache.updateSymbolsQuotes(symbols)

    // Get updated quotes from cache
    const quotes = await this.quoteCache.getCachedQuotes(symbols)

    // Emit quote update event
    const event = new QuoteUpdateEvent(symbols, quotes, new Date())
    this.eventEmitter.emit('data.quotes.updated', event)

    this.logger.log(`Updated quotes for ${symbols.length} symbols`)
  }

  /**
   * Trigger portfolio value update
   */
  private async triggerPortfolioValueUpdate(): Promise<void> {
    this.logger.log('Triggering portfolio value update...')
    
    const event = new DataUpdateEvent('portfolio-values', new Date())
    this.eventEmitter.emit('data.portfolio-values.update', event)
  }


  /**
   * Trigger indicator calculation
   */
  private async triggerIndicatorCalculation(): Promise<void> {
    this.logger.log('Triggering indicator calculation...')
    
    const event = new DataUpdateEvent('indicators', new Date())
    this.eventEmitter.emit('data.indicators.update', event)
  }

  /**
   * Manual trigger for immediate update
   */
  async triggerImmediateUpdate(): Promise<void> {
    this.logger.log('Triggering immediate data update...')
    await this.orchestrateDataUpdate()
  }

  /**
   * Get update status
   */
  getUpdateStatus(): { isUpdating: boolean; lastUpdate?: Date } {
    return {
      isUpdating: this.isUpdating
    }
  }
}
