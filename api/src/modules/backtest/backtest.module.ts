import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TradingModule } from '../trading/trading.module';
import { StrategyModule } from '../strategy/strategy.module';
import { EmaGapAtrStrategyService } from '../strategy/services/ema-gap-atr-strategy.service';
import { AdvancedATRStrategyService } from '../strategy/services/advanced-atr-strategy.service';
import { CsvDataProvider } from '../trading/providers/csv-data-provider';
import { MockOrderExecutionProvider } from '../trading/providers/mock-order-execution';

// Controllers
import { BacktestController } from './controllers/backtest.controller';
import { BacktestValidationController } from './controllers/backtest-validation.controller';

// Services
import { BacktestOrchestratorService } from './services/backtest-orchestrator.service';
import { BacktestValidationService } from './services/backtest-validation.service';
import { BacktestSafetyService } from './services/backtest-safety.service';
import { BacktestDataService } from './services/backtest-data.service';
import { BacktestMetricsService } from './services/backtest-metrics.service';

// Entities
import { BacktestRun } from './entities/backtest-run.entity';
import { BacktestResult } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BacktestRun, BacktestResult, BacktestTrade]),
    EventEmitterModule.forRoot(),
    TradingModule,
    StrategyModule,
  ],
  controllers: [BacktestController, BacktestValidationController],
  providers: [
    BacktestOrchestratorService,
    BacktestValidationService,
    BacktestSafetyService,
    BacktestDataService,
    BacktestMetricsService,
    EmaGapAtrStrategyService,
    AdvancedATRStrategyService,
    CsvDataProvider,
    MockOrderExecutionProvider,
  ],
  exports: [
    BacktestOrchestratorService,
    BacktestValidationService,
    BacktestSafetyService,
    BacktestDataService,
    BacktestMetricsService,
  ],
})
export class BacktestModule {}
