import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { LiveDataFeedService, LiveCandleData } from './live-data-feed.service';
import { CandleAggregationService } from './candle-aggregation.service';
import { TimeframeType } from '../schemas/candle.schema';

interface LiveDataEvent {
  subscriptionId: string;
  data: LiveCandleData;
  timeframes: TimeframeType[];
}

@Injectable()
export class TradingEventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TradingEventListenerService.name);
  private isProcessing = false;

  constructor(
    private eventEmitter: EventEmitter2,
    private liveDataFeedService: LiveDataFeedService,
    private candleAggregationService: CandleAggregationService,
  ) {}

  async onModuleInit() {
    this.logger.log('Trading Event Listener Service initialized');
    this.isProcessing = true;
  }

  async onModuleDestroy() {
    this.logger.log('Trading Event Listener Service shutting down');
    this.isProcessing = false;
  }

  /**
   * Handle live data events from the data feed service
   */
  @OnEvent('trading.liveData')
  async handleLiveData(event: LiveDataEvent) {
    if (!this.isProcessing) return;

    try {
      this.logger.debug(`Processing live data for ${event.data.symbol} on subscription ${event.subscriptionId}`);

      // Process the candle data through aggregation
      await this.candleAggregationService.processLiveCandle(event.data, event.timeframes);

      // Emit event for indicators to process
      this.eventEmitter.emit('trading.candleAggregated', {
        subscriptionId: event.subscriptionId,
        symbol: event.data.symbol,
        timestamp: event.data.timestamp,
        price: event.data.price,
        timeframes: event.timeframes,
      });

      this.logger.debug(`Successfully processed live data for ${event.data.symbol}`);

    } catch (error) {
      this.logger.error(`Failed to process live data for ${event.data.symbol}:`, error);
    }
  }

  /**
   * Handle candle aggregation completion events
   */
  @OnEvent('trading.candleAggregated')
  async handleCandleAggregated(event: {
    subscriptionId: string;
    symbol: string;
    timestamp: number;
    price: number;
    timeframes: TimeframeType[];
  }) {
    if (!this.isProcessing) return;

    try {
      this.logger.debug(`Candle aggregated for ${event.symbol} - triggering indicator calculations`);

      // Emit event for strategy evaluation
      this.eventEmitter.emit('trading.indicatorUpdate', {
        symbol: event.symbol,
        timestamp: event.timestamp,
        timeframes: event.timeframes,
      });

    } catch (error) {
      this.logger.error(`Failed to handle candle aggregation for ${event.symbol}:`, error);
    }
  }

  /**
   * Handle indicator update events
   */
  @OnEvent('trading.indicatorUpdate')
  async handleIndicatorUpdate(event: {
    symbol: string;
    timestamp: number;
    timeframes: TimeframeType[];
  }) {
    if (!this.isProcessing) return;

    try {
      this.logger.debug(`Indicators updated for ${event.symbol} - triggering strategy evaluation`);

      // Emit event for strategy processing
      this.eventEmitter.emit('trading.strategyEvaluation', {
        symbol: event.symbol,
        timestamp: event.timestamp,
        timeframes: event.timeframes,
      });

    } catch (error) {
      this.logger.error(`Failed to handle indicator update for ${event.symbol}:`, error);
    }
  }

  /**
   * Handle strategy evaluation events
   */
  @OnEvent('trading.strategyEvaluation')
  async handleStrategyEvaluation(event: {
    symbol: string;
    timestamp: number;
    timeframes: TimeframeType[];
  }) {
    if (!this.isProcessing) return;

    try {
      this.logger.debug(`Evaluating strategies for ${event.symbol}`);

      // This is where trading strategies would be evaluated
      // For now, just emit an event for potential trade signals
      this.eventEmitter.emit('trading.strategyEvaluated', {
        symbol: event.symbol,
        timestamp: event.timestamp,
        signal: null, // No signal generated
        timeframes: event.timeframes,
      });

    } catch (error) {
      this.logger.error(`Failed to evaluate strategies for ${event.symbol}:`, error);
    }
  }

  /**
   * Handle strategy evaluation completion
   */
  @OnEvent('trading.strategyEvaluated')
  async handleStrategyEvaluated(event: {
    symbol: string;
    timestamp: number;
    signal: any;
    timeframes: TimeframeType[];
  }) {
    if (!this.isProcessing) return;

    try {
      if (event.signal) {
        this.logger.log(`Trading signal generated for ${event.symbol}:`, event.signal);

        // Emit event for trade execution
        this.eventEmitter.emit('trading.signalGenerated', {
          symbol: event.symbol,
          timestamp: event.timestamp,
          signal: event.signal,
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle strategy evaluation for ${event.symbol}:`, error);
    }
  }

  /**
   * Handle trading signal events
   */
  @OnEvent('trading.signalGenerated')
  async handleSignalGenerated(event: {
    symbol: string;
    timestamp: number;
    signal: any;
  }) {
    if (!this.isProcessing) return;

    try {
      this.logger.log(`Processing trading signal for ${event.symbol}:`, event.signal);

      // This is where trade orders would be generated and executed
      // For now, just log the signal
      this.logger.log(`🚨 TRADE SIGNAL: ${event.symbol} - ${JSON.stringify(event.signal)}`);

    } catch (error) {
      this.logger.error(`Failed to handle trading signal for ${event.symbol}:`, error);
    }
  }

  /**
   * Pause event processing (useful for maintenance)
   */
  pauseProcessing(): void {
    this.isProcessing = false;
    this.logger.log('Trading event processing paused');
  }

  /**
   * Resume event processing
   */
  resumeProcessing(): void {
    this.isProcessing = true;
    this.logger.log('Trading event processing resumed');
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): boolean {
    return this.isProcessing;
  }

  /**
   * Emit custom event (useful for testing)
   */
  emitCustomEvent(eventName: string, data: any): void {
    this.eventEmitter.emit(eventName, data);
    this.logger.debug(`Emitted custom event: ${eventName}`);
  }
}
