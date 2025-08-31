import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import type { SubscriptionConfig } from '../services/live-data-feed.service';
import { LiveDataFeedService } from '../services/live-data-feed.service';
import { CandleAggregationService } from '../services/candle-aggregation.service';
import { TradingEventListenerService } from '../services/trading-event-listener.service';
import type { TimeframeType } from '../schemas/candle.schema';

// Define local type for aggregated candle response
interface AggregatedCandleResponse {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  count: number;
  startTime: number;
}

@Controller('trading')
export class TradingController {
  private readonly logger = new Logger(TradingController.name);

  constructor(
    private liveDataFeedService: LiveDataFeedService,
    private candleAggregationService: CandleAggregationService,
    private eventListenerService: TradingEventListenerService,
  ) {}

  /**
   * Subscribe to live data feeds
   */
  @Post('subscriptions')
  async createSubscription(@Body() config: SubscriptionConfig) {
    try {
      const subscriptionId = await this.liveDataFeedService.subscribe(config);
      this.logger.log(`Created subscription ${subscriptionId} for ${config.symbols.length} symbols`);

      return {
        success: true,
        subscriptionId,
        config,
        message: 'Subscription created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create subscription:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all active subscriptions
   */
  @Get('subscriptions')
  async getAllSubscriptions() {
    try {
      const subscriptions = this.liveDataFeedService.getAllSubscriptions();
      return {
        success: true,
        subscriptions,
        count: Object.keys(subscriptions).length,
      };
    } catch (error) {
      this.logger.error('Failed to get subscriptions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get subscription status
   */
  @Get('subscriptions/:subscriptionId')
  async getSubscriptionStatus(@Param('subscriptionId') subscriptionId: string) {
    try {
      const config = this.liveDataFeedService.getSubscriptionStatus(subscriptionId);
      if (!config) {
        return {
          success: false,
          error: 'Subscription not found',
        };
      }

      return {
        success: true,
        subscriptionId,
        config,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription ${subscriptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Unsubscribe from live data
   */
  @Delete('subscriptions/:subscriptionId')
  async unsubscribe(@Param('subscriptionId') subscriptionId: string) {
    try {
      await this.liveDataFeedService.unsubscribe(subscriptionId);
      this.logger.log(`Unsubscribed from ${subscriptionId}`);

      return {
        success: true,
        message: 'Unsubscribed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe ${subscriptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Trigger manual data fetch for testing
   */
  @Post('subscriptions/:subscriptionId/trigger')
  async triggerDataFetch(@Param('subscriptionId') subscriptionId: string) {
    try {
      await this.liveDataFeedService.triggerDataFetch(subscriptionId);
      this.logger.log(`Triggered data fetch for ${subscriptionId}`);

      return {
        success: true,
        message: 'Data fetch triggered successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to trigger data fetch for ${subscriptionId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get latest live data for a symbol
   */
  @Get('live-data/:symbol')
  async getLatestLiveData(@Param('symbol') symbol: string) {
    try {
      const liveData = await this.liveDataFeedService.getLatestLiveData(symbol);
      if (!liveData) {
        return {
          success: false,
          error: 'No live data available for symbol',
        };
      }

      return {
        success: true,
        data: liveData,
      };
    } catch (error) {
      this.logger.error(`Failed to get live data for ${symbol}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get aggregated candle data from Redis (for debugging)
   */
  @Get('aggregation/:symbol/:timeframe')
  async getAggregatedCandle(
    @Param('symbol') symbol: string,
    @Param('timeframe') timeframe: TimeframeType,
  ): Promise<{ success: boolean; symbol?: string; timeframe?: string; data?: AggregatedCandleResponse | null; error?: string }> {
    try {
      const aggregatedData = await this.candleAggregationService.getAggregatedCandle(symbol, timeframe);

      return {
        success: true,
        symbol,
        timeframe,
        data: aggregatedData,
      };
    } catch (error) {
      this.logger.error(`Failed to get aggregated data for ${symbol}:${timeframe}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Flush all aggregations to database
   */
  @Post('aggregation/flush')
  async flushAggregations() {
    try {
      await this.candleAggregationService.flushAllAggregations();
      this.logger.log('Flushed all candle aggregations');

      return {
        success: true,
        message: 'All aggregations flushed to database',
      };
    } catch (error) {
      this.logger.error('Failed to flush aggregations:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up old aggregation data
   */
  @Post('aggregation/cleanup')
  async cleanupAggregations(@Query('olderThanMs') olderThanMs?: string) {
    try {
      const cutoffMs = olderThanMs ? parseInt(olderThanMs) : 24 * 60 * 60 * 1000; // Default 24 hours
      await this.candleAggregationService.cleanupOldAggregations(cutoffMs);
      this.logger.log(`Cleaned up aggregations older than ${cutoffMs}ms`);

      return {
        success: true,
        message: `Cleaned up aggregations older than ${cutoffMs}ms`,
      };
    } catch (error) {
      this.logger.error('Failed to cleanup aggregations:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get event processing status
   */
  @Get('status')
  async getProcessingStatus() {
    try {
      const isProcessing = this.eventListenerService.getProcessingStatus();

      return {
        success: true,
        isProcessing,
        message: isProcessing ? 'Event processing is active' : 'Event processing is paused',
      };
    } catch (error) {
      this.logger.error('Failed to get processing status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Pause event processing
   */
  @Post('pause')
  async pauseProcessing() {
    try {
      this.eventListenerService.pauseProcessing();
      this.logger.log('Trading event processing paused');

      return {
        success: true,
        message: 'Event processing paused',
      };
    } catch (error) {
      this.logger.error('Failed to pause processing:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Resume event processing
   */
  @Post('resume')
  async resumeProcessing() {
    try {
      this.eventListenerService.resumeProcessing();
      this.logger.log('Trading event processing resumed');

      return {
        success: true,
        message: 'Event processing resumed',
      };
    } catch (error) {
      this.logger.error('Failed to resume processing:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Emit custom event (for testing)
   */
  @Post('events')
  async emitCustomEvent(
    @Body() body: { eventName: string; data: any },
  ) {
    try {
      this.eventListenerService.emitCustomEvent(body.eventName, body.data);
      this.logger.log(`Emitted custom event: ${body.eventName}`);

      return {
        success: true,
        message: `Event ${body.eventName} emitted`,
      };
    } catch (error) {
      this.logger.error('Failed to emit custom event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
