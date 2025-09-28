import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
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
import { CandleQueryService } from './services/candle-query.service';
import { OptionStrikeCalculatorService } from './services/option-strike-calculator.service';
import { TradingOrchestratorService } from './services/trading-orchestrator.service';
import { CsvDataProvider } from './providers/csv-data-provider';
import { GrowwDataProvider } from './providers/groww-data-provider';
import { MockOrderExecutionProvider } from './providers/mock-order-execution';
import { GrowwOrderExecutionProvider } from './providers/groww-order-execution';
import { GrowwApiService } from '../broker/services/groww-api.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

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
    // HTTP module for API calls
    HttpModule,
    // Broker module for GrowwApiService
    BrokerModule,
  ],
  controllers: [TradingController],
  providers: [
    LiveDataFeedService,
    CandleAggregationService,
    TradingEventListenerService,
    CandleQueryService,
    OptionStrikeCalculatorService,
    TradingOrchestratorService,
    {
      provide: 'DATA_PROVIDER',
      useFactory: (httpService: HttpService, configService: ConfigService) => {
        const mode = process.env.DATA_PROVIDER_MODE || 'csv';
        if (mode === 'groww') {
          return new GrowwDataProvider(httpService, configService);
        }
        return new CsvDataProvider();
      },
      inject: [HttpService, ConfigService],
    },
    {
      provide: 'ORDER_EXECUTION',
      useFactory: (httpService: HttpService, configService: ConfigService) => {
        const mode = process.env.ORDER_EXECUTION_MODE || 'mock';
        if (mode === 'groww') {
          return new GrowwOrderExecutionProvider(httpService, configService);
        }
        return new MockOrderExecutionProvider();
      },
      inject: [HttpService, ConfigService],
    },
    CsvDataProvider,
    GrowwDataProvider,
    MockOrderExecutionProvider,
    GrowwOrderExecutionProvider,
  ],
  exports: [
    LiveDataFeedService,
    CandleAggregationService,
    TradingEventListenerService,
    CandleQueryService,
    OptionStrikeCalculatorService,
    TradingOrchestratorService,
    'DATA_PROVIDER',
    'ORDER_EXECUTION',
    CsvDataProvider,
    GrowwDataProvider,
    MockOrderExecutionProvider,
    GrowwOrderExecutionProvider,
  ],
})
export class TradingModule {}
