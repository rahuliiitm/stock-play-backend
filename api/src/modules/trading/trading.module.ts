import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BrokerModule } from '../broker/broker.module';

// Import all candle entities
import {
  Candle1m,
  Candle5m,
  Candle15m,
  Candle30m,
  Candle1h,
  Candle4h,
  Candle1d,
} from './schemas/candle.schema';

// Import services
import { LiveDataFeedService } from './services/live-data-feed.service';
import { CandleAggregationService } from './services/candle-aggregation.service';
import { TradingEventListenerService } from './services/trading-event-listener.service';

// Import controllers
import { TradingController } from './controllers/trading.controller';

@Module({
  imports: [
    // Register all candle entities
    TypeOrmModule.forFeature([
      Candle1m,
      Candle5m,
      Candle15m,
      Candle30m,
      Candle1h,
      Candle4h,
      Candle1d,
    ]),
    // Event emitter for trading events
    EventEmitterModule.forRoot(),
    // Broker module for GrowwApiService
    BrokerModule,
  ],
  controllers: [TradingController],
  providers: [
    LiveDataFeedService,
    CandleAggregationService,
    TradingEventListenerService,
  ],
  exports: [
    LiveDataFeedService,
    CandleAggregationService,
    TradingEventListenerService,
  ],
})
export class TradingModule {}
