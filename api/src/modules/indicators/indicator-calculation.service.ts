import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IndicatorConfig } from './indicator-config.entity'
import { IndicatorValue } from './indicator-value.entity'
import { IndicatorProviderRegistryService } from './indicator-provider-registry.service'
import { StockQuoteCacheService } from '../stocks/stock-quote-cache.service'
import { QuotesService } from '../stocks/quotes.service'
import { Candle } from '../../lib/market-data-sdk/models'

@Injectable()
export class IndicatorCalculationService {
  private readonly logger = new Logger(IndicatorCalculationService.name)

  constructor(
    @InjectRepository(IndicatorConfig)
    private readonly indicatorConfigs: Repository<IndicatorConfig>,
    @InjectRepository(IndicatorValue)
    private readonly indicatorValues: Repository<IndicatorValue>,
    private readonly providerRegistry: IndicatorProviderRegistryService,
    private readonly stockQuoteCache: StockQuoteCacheService,
    private readonly quotesService: QuotesService,
  ) {}

  /**
   * Calculate indicator for a specific symbol and indicator
   */
  async calculateIndicator(
    symbol: string,
    indicatorName: string,
    parameters: Record<string, any> = {}
  ): Promise<IndicatorValue | null> {
    try {
      // Get indicator provider
      const provider = this.providerRegistry.get(indicatorName)
      if (!provider) {
        this.logger.warn(`Indicator provider not found: ${indicatorName}`)
        return null
      }

      // Get historical data for the symbol
      const candles = await this.getHistoricalData(symbol, provider.minDataPoints)
      if (!candles || candles.length < provider.minDataPoints) {
        this.logger.warn(`Insufficient data for ${symbol} ${indicatorName}: ${candles?.length || 0} candles`)
        return null
      }

      // Calculate indicator
      const result = provider.calculate(candles, parameters)
      if (!result) {
        this.logger.warn(`Failed to calculate ${indicatorName} for ${symbol}`)
        return null
      }

      // Save indicator value
      const indicatorValue = this.indicatorValues.create({
        symbol,
        indicator_name: indicatorName,
        value: result.value,
        additional_data: result.additionalData,
        calculated_at: result.timestamp,
        interval: '1d', // Default interval
        lookback_period: provider.minDataPoints,
        parameters_used: parameters
      })

      const savedValue = await this.indicatorValues.save(indicatorValue)
      this.logger.log(`Calculated ${indicatorName} for ${symbol}: ${result.value}`)

      return savedValue
    } catch (error) {
      this.logger.error(`Error calculating ${indicatorName} for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Calculate all active indicators for a symbol
   */
  async calculateAllIndicatorsForSymbol(symbol: string): Promise<IndicatorValue[]> {
    const configs = await this.indicatorConfigs.find({
      where: { symbol, is_active: true }
    })

    const results: IndicatorValue[] = []

    for (const config of configs) {
      const result = await this.calculateIndicator(
        symbol,
        config.indicator_name,
        config.parameters
      )
      if (result) {
        results.push(result)
      }
    }

    this.logger.log(`Calculated ${results.length} indicators for ${symbol}`)
    return results
  }

  /**
   * Calculate indicators for all active symbols
   */
  async calculateAllIndicators(): Promise<void> {
    this.logger.log('Starting calculation of all indicators')

    // Get all unique symbols with active indicator configs
    const symbols = await this.indicatorConfigs
      .createQueryBuilder('config')
      .select('DISTINCT config.symbol', 'symbol')
      .where('config.is_active = :isActive', { isActive: true })
      .getRawMany()

    this.logger.log(`Found ${symbols.length} symbols with active indicators`)

    for (const { symbol } of symbols) {
      try {
        await this.calculateAllIndicatorsForSymbol(symbol)
      } catch (error) {
        this.logger.error(`Error calculating indicators for ${symbol}:`, error)
      }
    }

    this.logger.log('Completed calculation of all indicators')
  }

  /**
   * Get latest indicator value for a symbol and indicator
   */
  async getLatestIndicatorValue(
    symbol: string,
    indicatorName: string
  ): Promise<IndicatorValue | null> {
    return this.indicatorValues.findOne({
      where: { symbol, indicator_name: indicatorName },
      order: { calculated_at: 'DESC' }
    })
  }

  /**
   * Get all latest indicator values for a symbol
   */
  async getLatestIndicatorValues(symbol: string): Promise<IndicatorValue[]> {
    const subQuery = this.indicatorValues
      .createQueryBuilder('iv1')
      .select('iv1.indicator_name')
      .addSelect('MAX(iv1.calculated_at)', 'max_calculated_at')
      .where('iv1.symbol = :symbol', { symbol })
      .groupBy('iv1.indicator_name')

    return this.indicatorValues
      .createQueryBuilder('iv2')
      .innerJoin(`(${subQuery.getQuery()})`, 'sq', 
        'iv2.indicator_name = sq.indicator_name AND iv2.calculated_at = sq.max_calculated_at')
      .where('iv2.symbol = :symbol', { symbol })
      .setParameters(subQuery.getParameters())
      .getMany()
  }

  /**
   * Get indicator values for a symbol and indicator over time
   */
  async getIndicatorHistory(
    symbol: string,
    indicatorName: string,
    limit: number = 100
  ): Promise<IndicatorValue[]> {
    return this.indicatorValues.find({
      where: { symbol, indicator_name: indicatorName },
      order: { calculated_at: 'DESC' },
      take: limit
    })
  }

  /**
   * Add indicator configuration for a symbol
   */
  async addIndicatorConfig(
    symbol: string,
    indicatorName: string,
    parameters: Record<string, any>,
    description?: string
  ): Promise<IndicatorConfig> {
    // Validate indicator exists
    const provider = this.providerRegistry.get(indicatorName)
    if (!provider) {
      throw new Error(`Indicator provider not found: ${indicatorName}`)
    }

    // Validate required parameters
    for (const param of provider.requiredParameters) {
      if (!(param in parameters)) {
        throw new Error(`Missing required parameter: ${param}`)
      }
    }

    const config = this.indicatorConfigs.create({
      symbol,
      indicator_name: indicatorName,
      parameters,
      description,
      is_active: true,
      lookback_period: provider.minDataPoints
    })

    return this.indicatorConfigs.save(config)
  }

  /**
   * Update indicator configuration
   */
  async updateIndicatorConfig(
    id: string,
    updates: Partial<IndicatorConfig>
  ): Promise<IndicatorConfig | null> {
    await this.indicatorConfigs.update(id, updates)
    return this.indicatorConfigs.findOne({ where: { id } })
  }

  /**
   * Remove indicator configuration
   */
  async removeIndicatorConfig(id: string): Promise<void> {
    await this.indicatorConfigs.delete(id)
  }

  /**
   * Get all available indicators
   */
  getAvailableIndicators() {
    return this.providerRegistry.getAllProviderInfo()
  }

  /**
   * Get indicator configurations for a symbol
   */
  async getIndicatorConfigs(symbol: string): Promise<IndicatorConfig[]> {
    return this.indicatorConfigs.find({
      where: { symbol },
      order: { created_at: 'DESC' }
    })
  }

  /**
   * Scheduled job to calculate all indicators
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledIndicatorCalculation(): Promise<void> {
    this.logger.log('Running scheduled indicator calculation')
    await this.calculateAllIndicators()
  }

  /**
   * Get historical data for indicator calculation
   */
  private async getHistoricalData(symbol: string, minDataPoints: number): Promise<Candle[] | null> {
    try {
      // Calculate date range for historical data
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (minDataPoints * 24 * 60 * 60 * 1000)) // minDataPoints days ago

      // Get historical data using the existing quotes service
      const history = await this.quotesService.getHistory(symbol, startDate.toISOString(), endDate.toISOString(), 1440) // 1440 minutes = 1 day
      
      if (!history || history.length < minDataPoints) {
        this.logger.warn(`Insufficient historical data for ${symbol}: ${history?.length || 0} candles, need ${minDataPoints}`)
        return null
      }

      return history
    } catch (error) {
      this.logger.error(`Error getting historical data for ${symbol}:`, error)
      return null
    }
  }
}
