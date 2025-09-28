import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import {
  StrategyConfig,
  EntryCondition,
  ExitCondition,
} from '../interfaces/strategy-config.interface';
import { StrategyExecutionLog } from '../entities/strategy-execution-log.entity';
import { StrategyPosition } from '../entities/strategy-position.entity';
import { StrategyStatePersistenceService } from './strategy-state-persistence.service';
import {
  StrategyBuildingBlocksService,
  CandleData,
  IndicatorValue,
} from './strategy-building-blocks.service';
import { GrowwApiService } from '../../broker/services/groww-api.service';

interface StrategyWorkerMessage {
  type:
    | 'INIT'
    | 'CANDLE_UPDATE'
    | 'SIGNAL_GENERATED'
    | 'ORDER_EXECUTED'
    | 'ERROR'
    | 'HEARTBEAT';
  strategyId: string;
  data: any;
  timestamp: Date;
}

interface StrategyExecutionContext {
  strategyId: string;
  config: StrategyConfig;
  currentPosition?: StrategyPosition;
  entrySignal?: any;
  lastProcessedCandle?: CandleData;
  indicators: Record<string, IndicatorValue>;
  marketData: Record<string, any>;
}

@Injectable()
export class StrategyRunnerService implements OnModuleDestroy {
  private readonly logger = new Logger(StrategyRunnerService.name);
  private workers: Map<string, Worker> = new Map();
  private executionContexts: Map<string, StrategyExecutionContext> = new Map();

  constructor(
    private statePersistence: StrategyStatePersistenceService,
    private strategyBlocks: StrategyBuildingBlocksService,
    private growwApi: GrowwApiService,
  ) {}

  /**
   * Start a strategy in its own worker thread
   */
  async startStrategy(config: StrategyConfig): Promise<boolean> {
    try {
      // Check if strategy is already running
      if (this.workers.has(config.id)) {
        this.logger.warn(`Strategy ${config.id} is already running`);
        return false;
      }

      // Load existing state if available
      const existingState = await this.statePersistence.loadStrategyState(
        config.id,
      );
      const executionContext: StrategyExecutionContext = {
        strategyId: config.id,
        config,
        currentPosition: existingState?.currentPosition,
        entrySignal: existingState?.entrySignal,
        lastProcessedCandle: existingState?.lastProcessedCandle,
        indicators: {},
        marketData: {},
      };

      this.executionContexts.set(config.id, executionContext);

      // Create worker thread
      const workerPath = path.resolve(
        __dirname,
        '../workers/strategy.worker.js',
      );
      const worker = new Worker(workerPath, {
        workerData: {
          strategyId: config.id,
          config: config,
        },
      });

      // Set up worker message handling
      worker.on('message', (message: StrategyWorkerMessage) => {
        this.handleWorkerMessage(message);
      });

      worker.on('error', (error) => {
        this.logger.error(`Strategy ${config.id} worker error:`, error);
        this.handleStrategyError(config.id, error);
      });

      worker.on('exit', (code) => {
        this.logger.log(
          `Strategy ${config.id} worker exited with code ${code}`,
        );
        this.workers.delete(config.id);
      });

      this.workers.set(config.id, worker);

      // Log strategy start
      await this.logStrategyEvent(config.id, 'STRATEGY_STARTED', {
        workerThreadId: worker.threadId.toString(),
        config: config,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to start strategy ${config.id}:`, error);
      return false;
    }
  }

  /**
   * Stop a running strategy
   */
  async stopStrategy(strategyId: string): Promise<boolean> {
    try {
      const worker = this.workers.get(strategyId);
      if (!worker) {
        this.logger.warn(`Strategy ${strategyId} is not running`);
        return false;
      }

      // Send stop signal to worker
      worker.postMessage({
        type: 'STOP',
        strategyId,
        timestamp: new Date(),
      });

      // Wait for worker to exit
      await new Promise((resolve) => {
        worker.once('exit', resolve);
      });

      this.workers.delete(strategyId);
      this.executionContexts.delete(strategyId);

      // Log strategy stop
      await this.logStrategyEvent(strategyId, 'STRATEGY_STOPPED', {});

      return true;
    } catch (error) {
      this.logger.error(`Failed to stop strategy ${strategyId}:`, error);
      return false;
    }
  }

  /**
   * Process new candle data for a strategy
   */
  async processCandleData(
    strategyId: string,
    candle: CandleData,
    indicators: Record<string, IndicatorValue>,
  ): Promise<void> {
    const worker = this.workers.get(strategyId);
    if (!worker) {
      this.logger.warn(`Strategy ${strategyId} is not running`);
      return;
    }

    const context = this.executionContexts.get(strategyId);
    if (!context) {
      this.logger.error(
        `No execution context found for strategy ${strategyId}`,
      );
      return;
    }

    // Update context
    context.lastProcessedCandle = candle;
    context.indicators = { ...context.indicators, ...indicators };

    // Send candle update to worker
    worker.postMessage({
      type: 'CANDLE_UPDATE',
      strategyId,
      data: {
        candle,
        indicators,
        currentPosition: context.currentPosition,
        entrySignal: context.entrySignal,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle messages from worker threads
   */
  private async handleWorkerMessage(
    message: StrategyWorkerMessage,
  ): Promise<void> {
    const { strategyId, type, data } = message;

    try {
      switch (type) {
        case 'SIGNAL_GENERATED':
          await this.handleSignalGenerated(strategyId, data);
          break;
        case 'ORDER_EXECUTED':
          await this.handleOrderExecuted(strategyId, data);
          break;
        case 'ERROR':
          await this.handleStrategyError(strategyId, data);
          break;
        case 'HEARTBEAT':
          await this.handleHeartbeat(strategyId, data);
          break;
        default:
          this.logger.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling worker message for ${strategyId}:`,
        error,
      );
    }
  }

  /**
   * Handle signal generation from worker
   */
  private async handleSignalGenerated(
    strategyId: string,
    signalData: any,
  ): Promise<void> {
    const context = this.executionContexts.get(strategyId);
    if (!context) return;

    // Update context based on signal type
    if (signalData.type === 'ENTRY') {
      context.entrySignal = signalData;
    } else if (signalData.type === 'EXIT') {
      context.entrySignal = undefined;
    }

    // Persist state
    await this.statePersistence.saveStrategyState(strategyId, {
      entrySignal: context.entrySignal,
      lastProcessedCandle: context.lastProcessedCandle,
    });

    // Log signal
    await this.logStrategyEvent(strategyId, 'SIGNAL_GENERATED', signalData);

    // If it's an entry signal, execute order
    if (signalData.type === 'ENTRY') {
      await this.executeEntryOrder(strategyId, signalData);
    } else if (signalData.type === 'EXIT') {
      await this.executeExitOrder(strategyId, signalData);
    }
  }

  /**
   * Execute entry order through broker
   */
  private async executeEntryOrder(
    strategyId: string,
    signalData: any,
  ): Promise<void> {
    try {
      const context = this.executionContexts.get(strategyId);
      if (!context) return;

      const { config } = context;

      // Generate order based on signal and config
      const orderDetails = this.generateOrderFromSignal(config, signalData);

      if (!orderDetails) {
        this.logger.error(
          `Failed to generate order for strategy ${strategyId}`,
        );
        return;
      }

      // Execute order through broker
      const orderResult = await this.growwApi.placeOrder(orderDetails);

      if (orderResult && orderResult.orderId) {
        // Create position record
        const position = await this.createPositionRecord(
          strategyId,
          orderResult,
          signalData,
        );

        // Update context
        context.currentPosition = position;

        // Persist state
        await this.statePersistence.saveStrategyState(strategyId, {
          currentPosition: position,
        });

        // Log successful order
        await this.logStrategyEvent(strategyId, 'ORDER_EXECUTED', {
          orderId: orderResult.orderId,
          positionId: position.id,
          signalData,
        });

        // Notify worker of successful execution
        const worker = this.workers.get(strategyId);
        if (worker) {
          worker.postMessage({
            type: 'ORDER_EXECUTED',
            strategyId,
            data: { orderResult, position },
            timestamp: new Date(),
          });
        }
      } else {
        this.logger.error(
          `Order execution failed for strategy ${strategyId}:`,
          orderResult,
        );

        // Log failed order
        await this.logStrategyEvent(strategyId, 'ORDER_FAILED', {
          signalData,
          error: orderResult?.message || 'Unknown error',
        });
      }
    } catch (error) {
      this.logger.error(
        `Error executing entry order for ${strategyId}:`,
        error,
      );
      await this.logStrategyEvent(strategyId, 'ORDER_ERROR', {
        signalData,
        error: error.message,
      });
    }
  }

  /**
   * Execute exit order through broker
   */
  private async executeExitOrder(
    strategyId: string,
    signalData: any,
  ): Promise<void> {
    try {
      const context = this.executionContexts.get(strategyId);
      if (!context || !context.currentPosition) {
        this.logger.warn(`No position to exit for strategy ${strategyId}`);
        return;
      }

      const position = context.currentPosition;

      // Generate exit order
      const exitOrders = this.generateExitOrders(position);

      // Execute exit orders
      const exitResults: any[] = [];
      for (const order of exitOrders) {
        const result = await this.growwApi.placeOrder(order);
        exitResults.push(result);
      }

      // Check if all orders were successful
      const successfulOrders = exitResults.filter((r) => r && r.orderId);
      const failedOrders = exitResults.filter((r) => !r || !r.orderId);

      if (successfulOrders.length === exitOrders.length) {
        // Mark position as closed
        position.status = 'CLOSED';
        position.closedAt = new Date();
        position.exitReason = signalData.exitReason;

        // Update context
        context.currentPosition = undefined;

        // Persist state
        await this.statePersistence.saveStrategyState(strategyId, {
          currentPosition: undefined,
        });

        // Log successful exit
        await this.logStrategyEvent(strategyId, 'POSITION_CLOSED', {
          positionId: position.id,
          exitReason: signalData.exitReason,
          pnl: position.realizedPnL,
        });
      } else {
        this.logger.error(
          `Partial exit failure for strategy ${strategyId}: ${failedOrders.length} failed orders`,
        );
      }

      // Notify worker
      const worker = this.workers.get(strategyId);
      if (worker) {
        worker.postMessage({
          type: 'EXIT_EXECUTED',
          strategyId,
          data: { exitResults, position },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error executing exit order for ${strategyId}:`, error);
    }
  }

  /**
   * Handle order execution confirmation
   */
  private async handleOrderExecuted(
    strategyId: string,
    orderData: any,
  ): Promise<void> {
    await this.logStrategyEvent(strategyId, 'ORDER_EXECUTED', orderData);
  }

  /**
   * Handle strategy errors
   */
  private async handleStrategyError(
    strategyId: string,
    error: any,
  ): Promise<void> {
    this.logger.error(`Strategy ${strategyId} error:`, error);

    // Log error
    await this.logStrategyEvent(strategyId, 'STRATEGY_ERROR', {
      error: error.message || error,
      timestamp: new Date(),
    });

    // Attempt to restart strategy
    const context = this.executionContexts.get(strategyId);
    if (context) {
      await this.restartStrategy(strategyId);
    }
  }

  /**
   * Handle heartbeat from worker
   */
  private async handleHeartbeat(
    strategyId: string,
    heartbeatData: any,
  ): Promise<void> {
    await this.statePersistence.updateHeartbeat(strategyId);
  }

  /**
   * Restart a failed strategy
   */
  private async restartStrategy(strategyId: string): Promise<void> {
    try {
      // Stop existing worker if running
      await this.stopStrategy(strategyId);

      // Wait a bit before restarting
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get context and restart
      const context = this.executionContexts.get(strategyId);
      if (context) {
        await this.startStrategy(context.config);
        this.logger.log(`Strategy ${strategyId} restarted successfully`);
      }
    } catch (error) {
      this.logger.error(`Failed to restart strategy ${strategyId}:`, error);
    }
  }

  /**
   * Generate order details from signal
   */
  private generateOrderFromSignal(
    config: StrategyConfig,
    signalData: any,
  ): any {
    const { orderConfig } = config;

    if (!orderConfig.spreadConfig) {
      return null;
    }

    const { spreadConfig } = orderConfig;

    // Get current spot price (this would come from market data)
    const spotPrice = signalData.spotPrice || 22000; // Default for testing

    // Calculate strikes
    const baseStrike = Math.round(spotPrice / 50) * 50;

    let sellStrike: number;
    let buyStrike: number;
    let sellOptionType: 'CE' | 'PE';
    let buyOptionType: 'CE' | 'PE';

    if (signalData.signalType === 'BULL_PUT_SPREAD') {
      sellStrike = baseStrike + spreadConfig.sellStrikeOffset;
      buyStrike = sellStrike - spreadConfig.buyStrikeOffset;
      sellOptionType = 'PE';
      buyOptionType = 'PE';
    } else if (signalData.signalType === 'BEAR_CALL_SPREAD') {
      sellStrike = baseStrike + spreadConfig.sellStrikeOffset;
      buyStrike = sellStrike + spreadConfig.buyStrikeOffset;
      sellOptionType = 'CE';
      buyOptionType = 'CE';
    } else {
      return null;
    }

    return {
      symbol: config.underlyingSymbol,
      orders: [
        {
          side: 'SELL',
          optionType: sellOptionType,
          strike: sellStrike,
          quantity: orderConfig.quantity,
          orderType: orderConfig.orderType,
          productType: orderConfig.productType,
        },
        {
          side: 'BUY',
          optionType: buyOptionType,
          strike: buyStrike,
          quantity: orderConfig.quantity,
          orderType: orderConfig.orderType,
          productType: orderConfig.productType,
        },
      ],
      expiry: this.getExpiryDate(spreadConfig.expiryType),
    };
  }

  /**
   * Generate exit orders for position
   */
  private generateExitOrders(position: StrategyPosition): any[] {
    // This would generate orders to close the spread position
    // For now, return empty array as this depends on position structure
    return [];
  }

  /**
   * Create position record
   */
  private async createPositionRecord(
    strategyId: string,
    orderResult: any,
    signalData: any,
  ): Promise<StrategyPosition> {
    // This would create a position record in the database
    // For now, return a mock position
    return {
      id: `pos_${Date.now()}`,
      strategyId,
      status: 'OPEN',
      entryTime: new Date(),
      entryPrice: 0,
      quantity: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
    } as StrategyPosition;
  }

  /**
   * Get expiry date based on type
   */
  private getExpiryDate(expiryType: 'weekly' | 'monthly'): Date {
    const now = new Date();

    if (expiryType === 'weekly') {
      const dayOfWeek = now.getDay();
      const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
      const expiryDate = new Date(now);
      expiryDate.setDate(now.getDate() + daysUntilThursday);
      expiryDate.setHours(15, 30, 0, 0);
      return expiryDate;
    } else {
      // Monthly expiry - last Thursday of the month
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastThursday = new Date(lastDayOfMonth);
      lastThursday.setDate(
        lastDayOfMonth.getDate() - ((lastDayOfMonth.getDay() + 3) % 7),
      );
      lastThursday.setHours(15, 30, 0, 0);
      return lastThursday;
    }
  }

  /**
   * Log strategy event
   */
  private async logStrategyEvent(
    strategyId: string,
    action: string,
    details: any,
  ): Promise<void> {
    try {
      await this.strategyBlocks.logExecutionEvent({
        strategyId,
        phase: 'EXECUTION',
        action: action as any,
        details,
        success: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log strategy event:`, error);
    }
  }

  /**
   * Get running strategies
   */
  getRunningStrategies(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Get strategy status
   */
  getStrategyStatus(strategyId: string): any {
    const worker = this.workers.get(strategyId);
    const context = this.executionContexts.get(strategyId);

    return {
      isRunning: !!worker,
      workerId: worker?.threadId,
      hasPosition: !!context?.currentPosition,
      lastCandle: context?.lastProcessedCandle,
      indicators: context?.indicators || {},
    };
  }

  /**
   * Clean shutdown
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down strategy runners...');

    const shutdownPromises = Array.from(this.workers.keys()).map((strategyId) =>
      this.stopStrategy(strategyId),
    );

    await Promise.all(shutdownPromises);
    this.logger.log('All strategy runners stopped');
  }
}
