import { Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BrokerModule } from '../broker/broker.module';

// Entities
import { Strategy } from './entities/strategy.entity';
import { StrategyRuntimeState } from './entities/strategy-runtime-state.entity';
import { StrategyPosition } from './entities/strategy-position.entity';
import { StrategyOrder } from './entities/strategy-order.entity';
import { StrategyExecutionLog } from './entities/strategy-execution-log.entity';
import { MissedDataTracking } from './entities/missed-data-tracking.entity';

// Services
import { StrategyStatePersistenceService } from './services/strategy-state-persistence.service';
import { StrategyRecoveryService } from './services/strategy-recovery.service';
import { StrategyWorkerManager } from './services/strategy-worker-manager.service';
import { StrategyBuildingBlocksService } from './services/strategy-building-blocks.service';
import { StrategyRunnerService } from './services/strategy-runner.service';
import { EmaGapAtrStrategyService } from './services/ema-gap-atr-strategy.service';
import { StrategySignalListenerService } from './services/strategy-signal-listener.service';
import { TradingStrategyRunnerService } from './services/trading-strategy-runner.service';
import { TradingModule } from '../trading/trading.module';

// Controllers
import { StrategyController } from './controllers/strategy.controller';
import { StrategyHealthController } from './controllers/strategy-health.controller';
import { StrategyManagementController } from './controllers/strategy-management.controller';

@Module({
  imports: [
    ConfigModule,
    BrokerModule,
    TradingModule,
    TypeOrmModule.forFeature([
      Strategy,
      StrategyRuntimeState,
      StrategyPosition,
      StrategyOrder,
      StrategyExecutionLog,
      MissedDataTracking,
    ]),
  ],
  controllers: [
    StrategyController,
    StrategyHealthController,
    StrategyManagementController,
  ],
  providers: [
    StrategyStatePersistenceService,
    StrategyRecoveryService,
    StrategyWorkerManager,
    StrategyBuildingBlocksService,
    StrategyRunnerService,
    EmaGapAtrStrategyService,
    StrategySignalListenerService,
    TradingStrategyRunnerService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (): Redis => {
        const url =
          process.env.REDIS_URL ||
          `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
        return new Redis(url);
      },
    },
  ],
  exports: [
    StrategyStatePersistenceService,
    StrategyRecoveryService,
    StrategyWorkerManager,
    StrategyRunnerService,
    TypeOrmModule,
  ],
})
export class StrategyModule implements OnModuleDestroy {
  constructor(private workerManager: StrategyWorkerManager) {}

  async onModuleDestroy() {
    // Graceful shutdown of all workers
    await this.workerManager.shutdown();
  }
}
