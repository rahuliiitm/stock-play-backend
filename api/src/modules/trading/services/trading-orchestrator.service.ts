import { Injectable, Logger, Inject } from '@nestjs/common'
import type { MarketDataProvider } from '../interfaces/data-provider.interface'
import type { OrderExecutionProvider } from '../interfaces/order-execution.interface'
import { EventEmitter2 } from '@nestjs/event-emitter'

/**
 * Trading Orchestrator Service
 * 
 * This service acts as the main coordinator between data providers and order execution.
 * It follows the black box architecture by abstracting away the specific implementations
 * and providing a clean interface for strategy execution.
 */
@Injectable()
export class TradingOrchestratorService {
  private readonly logger = new Logger(TradingOrchestratorService.name)

  constructor(
    @Inject('DATA_PROVIDER') private readonly dataProvider: MarketDataProvider,
    @Inject('ORDER_EXECUTION') private readonly orderExecution: OrderExecutionProvider,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Initialize the trading system
   */
  async initialize(): Promise<boolean> {
    try {
      const dataAvailable = await this.dataProvider.isAvailable()
      const orderAvailable = await this.orderExecution.isAvailable()

      if (!dataAvailable) {
        this.logger.error('Data provider is not available')
        return false
      }

      if (!orderAvailable) {
        this.logger.error('Order execution provider is not available')
        return false
      }

      this.logger.log('Trading orchestrator initialized successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to initialize trading orchestrator:', error)
      return false
    }
  }

  /**
   * Get current market data for a symbol
   */
  async getMarketData(symbol: string) {
    try {
      return await this.dataProvider.getQuote(symbol)
    } catch (error) {
      this.logger.error(`Failed to get market data for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get historical data for backtesting
   */
  async getHistoricalData(symbol: string, timeframe: string, startDate: Date, endDate: Date) {
    try {
      return await this.dataProvider.getHistoricalCandles(symbol, timeframe, startDate, endDate)
    } catch (error) {
      this.logger.error(`Failed to get historical data for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Execute a trading signal
   */
  async executeSignal(signal: any) {
    try {
      this.logger.log(`Executing signal: ${signal.type} ${signal.data.direction}`)

      if (signal.type === 'ENTRY') {
        if (signal.data.direction === 'LONG') {
          return await this.orderExecution.placeBuyOrder({
            symbol: signal.data.symbol,
            quantity: signal.data.quantity || 1,
            price: signal.data.price,
            orderType: 'MARKET',
            product: 'MIS',
            validity: 'DAY'
          })
        } else if (signal.data.direction === 'SHORT') {
          return await this.orderExecution.placeSellOrder({
            symbol: signal.data.symbol,
            quantity: signal.data.quantity || 1,
            price: signal.data.price,
            orderType: 'MARKET',
            product: 'MIS',
            validity: 'DAY'
          })
        }
      }

      this.logger.warn(`Unknown signal type: ${signal.type}`)
      return { success: false, error: 'Unknown signal type' }
    } catch (error) {
      this.logger.error('Failed to execute signal:', error)
      throw error
    }
  }

  /**
   * Get current positions
   */
  async getPositions() {
    try {
      return await this.orderExecution.getPositions()
    } catch (error) {
      this.logger.error('Failed to get positions:', error)
      throw error
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    try {
      return await this.orderExecution.getBalance()
    } catch (error) {
      this.logger.error('Failed to get balance:', error)
      throw error
    }
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<{ dataProvider: boolean; orderExecution: boolean; overall: boolean }> {
    try {
      const dataProviderHealth = await this.dataProvider.isAvailable()
      const orderExecutionHealth = await this.orderExecution.isAvailable()

      return {
        dataProvider: dataProviderHealth,
        orderExecution: orderExecutionHealth,
        overall: dataProviderHealth && orderExecutionHealth
      }
    } catch (error) {
      this.logger.error('Failed to check system health:', error)
      return {
        dataProvider: false,
        orderExecution: false,
        overall: false
      }
    }
  }
}
