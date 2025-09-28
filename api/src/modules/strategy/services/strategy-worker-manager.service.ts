import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { Strategy } from '../entities/strategy.entity';
import { StrategyRuntimeState } from '../entities/strategy-runtime-state.entity';
import { StrategyStatePersistenceService } from './strategy-state-persistence.service';
import { StrategyExecutionLog } from '../entities/strategy-execution-log.entity';

export interface WorkerMessage {
  type: string;
  data: any;
  strategyId: string;
  timestamp: Date;
}

export interface StrategyWorker {
  strategyId: string;
  worker: Worker;
  startTime: Date;
  lastHeartbeat: Date;
  isHealthy: boolean;
}

@Injectable()
export class StrategyWorkerManager {
  private readonly logger = new Logger(StrategyWorkerManager.name);
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_MISSED_HEARTBEATS = 3;
  private readonly MAX_WORKERS = 50; // Limit concurrent workers

  private workers = new Map<string, StrategyWorker>();
  private workerPool: Worker[] = [];

  constructor(
    @InjectRepository(Strategy)
    private strategyRepository: Repository<Strategy>,
    @InjectRepository(StrategyExecutionLog)
    private executionLogRepository: Repository<StrategyExecutionLog>,
    private statePersistence: StrategyStatePersistenceService,
  ) {
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
  }

  /**
   * Start a strategy in a dedicated worker thread
   */
  async startStrategy(strategyId: string): Promise<void> {
    try {
      // Check worker limit
      if (this.workers.size >= this.MAX_WORKERS) {
        throw new Error(`Maximum worker limit reached (${this.MAX_WORKERS})`);
      }

      // Check if already running
      if (this.workers.has(strategyId)) {
        this.logger.warn(`Strategy ${strategyId} is already running`);
        return;
      }

      // Load strategy configuration
      const strategy = await this.strategyRepository.findOne({
        where: { id: strategyId },
        relations: ['runtimeState', 'positions'],
      });

      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      if (!strategy.isActive) {
        throw new Error(`Strategy ${strategyId} is not active`);
      }

      // Create worker thread
      const worker = new Worker(
        './dist/modules/strategy/workers/strategy.worker.js',
        {
          workerData: {
            strategyId,
            strategyConfig: strategy,
            heartbeatInterval: this.HEARTBEAT_INTERVAL,
          },
        },
      );

      const strategyWorker: StrategyWorker = {
        strategyId,
        worker,
        startTime: new Date(),
        lastHeartbeat: new Date(),
        isHealthy: true,
      };

      // Setup worker communication
      this.setupWorkerCommunication(strategyWorker);

      // Add to workers map
      this.workers.set(strategyId, strategyWorker);

      // Update state
      await this.statePersistence.saveStrategyState(strategyId, {
        isRunning: true,
        currentPhase: 'ENTRY',
        workerThreadId: worker.threadId.toString(),
        errorCount: 0,
        lastError: undefined,
        restartCount: strategy.runtimeState?.restartCount || 0,
      });

      // Log strategy start
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: 'ENTRY',
          action: 'STRATEGY_STARTED',
          details: { workerThreadId: worker.threadId },
        }),
      );

      this.logger.log(
        `✅ Started strategy ${strategyId} in worker thread ${worker.threadId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to start strategy ${strategyId}:`, error);

      // Log failure
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: 'ENTRY',
          action: 'STRATEGY_ERROR',
          success: false,
          errorMessage: error.message,
          details: { action: 'START_STRATEGY' },
        }),
      );

      throw error;
    }
  }

  /**
   * Stop a strategy worker
   */
  async stopStrategy(strategyId: string): Promise<void> {
    try {
      const strategyWorker = this.workers.get(strategyId);

      if (!strategyWorker) {
        this.logger.warn(`Strategy ${strategyId} is not running`);
        return;
      }

      // Send stop signal to worker
      strategyWorker.worker.postMessage({
        type: 'STOP',
        strategyId,
      });

      // Wait for worker to stop gracefully
      await this.waitForWorkerStop(strategyWorker, 5000);

      // Force terminate if still running
      if (!strategyWorker.worker.terminate) {
        strategyWorker.worker.terminate();
      }

      // Cleanup
      this.workers.delete(strategyId);

      // Update state
      await this.statePersistence.markStrategyAsStopped(strategyId);

      // Log strategy stop
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: 'EXIT',
          action: 'STRATEGY_STOPPED',
          details: { workerThreadId: strategyWorker.worker.threadId },
        }),
      );

      this.logger.log(`✅ Stopped strategy ${strategyId}`);
    } catch (error) {
      this.logger.error(`Failed to stop strategy ${strategyId}:`, error);
      throw error;
    }
  }

  /**
   * Restart strategy with recovered state
   */
  async restartStrategyWithState(
    strategyId: string,
    recoveredState: {
      currentPhase: string;
      phaseStates?: any;
      positions?: any[];
      lastProcessedCandle?: any;
    },
  ): Promise<void> {
    try {
      // Load strategy configuration
      const strategy = await this.strategyRepository.findOne({
        where: { id: strategyId },
      });

      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      // Create worker with recovered state
      const worker = new Worker(
        './dist/modules/strategy/workers/strategy.worker.js',
        {
          workerData: {
            strategyId,
            strategyConfig: strategy,
            recoveredState,
            heartbeatInterval: this.HEARTBEAT_INTERVAL,
          },
        },
      );

      const strategyWorker: StrategyWorker = {
        strategyId,
        worker,
        startTime: new Date(),
        lastHeartbeat: new Date(),
        isHealthy: true,
      };

      // Setup worker communication
      this.setupWorkerCommunication(strategyWorker);

      // Add to workers map
      this.workers.set(strategyId, strategyWorker);

      // Update state with recovered information
      await this.statePersistence.saveStrategyState(strategyId, {
        isRunning: true,
        currentPhase: recoveredState.currentPhase as any,
        workerThreadId: worker.threadId.toString(),
        phaseStates: recoveredState.phaseStates,
        lastProcessedCandle: recoveredState.lastProcessedCandle,
        restartCount: (strategy.runtimeState?.restartCount || 0) + 1,
      });

      // Log recovery
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: recoveredState.currentPhase,
          action: 'STRATEGY_STARTED',
          details: {
            workerThreadId: worker.threadId,
            recovered: true,
            phaseStates: recoveredState.phaseStates,
          },
        }),
      );

      this.logger.log(
        `🔄 Restarted strategy ${strategyId} with recovered state`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to restart strategy ${strategyId} with state:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Restart a strategy (used by heartbeat monitor)
   */
  async restartStrategy(strategyId: string): Promise<void> {
    try {
      // Stop existing worker if running
      if (this.workers.has(strategyId)) {
        await this.stopStrategy(strategyId);
      }

      // Start fresh
      await this.startStrategy(strategyId);
    } catch (error) {
      this.logger.error(`Failed to restart strategy ${strategyId}:`, error);
      throw error;
    }
  }

  /**
   * Setup communication with worker thread
   */
  private setupWorkerCommunication(strategyWorker: StrategyWorker): void {
    const { worker, strategyId } = strategyWorker;

    worker.on('message', async (message: WorkerMessage) => {
      try {
        await this.handleWorkerMessage(strategyId, message);
        strategyWorker.lastHeartbeat = new Date();
        strategyWorker.isHealthy = true;
      } catch (error) {
        this.logger.error(
          `Error handling worker message for ${strategyId}:`,
          error,
        );
      }
    });

    worker.on('error', async (error) => {
      this.logger.error(`Worker error for strategy ${strategyId}:`, error);
      strategyWorker.isHealthy = false;

      // Log error
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: 'UNKNOWN',
          action: 'STRATEGY_ERROR',
          success: false,
          errorMessage: error.message,
          details: { workerError: true },
        }),
      );

      // Auto-restart if configured
      setTimeout(() => {
        this.restartStrategy(strategyId);
      }, 5000);
    });

    worker.on('exit', async (code) => {
      this.logger.warn(
        `Worker exited for strategy ${strategyId} with code ${code}`,
      );

      // Remove from workers map
      this.workers.delete(strategyId);

      // Update state
      await this.statePersistence.markStrategyAsStopped(strategyId);

      // Log exit
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: 'EXIT',
          action: 'STRATEGY_STOPPED',
          success: code === 0,
          details: { exitCode: code, workerExit: true },
        }),
      );
    });
  }

  /**
   * Handle messages from worker threads
   */
  private async handleWorkerMessage(
    strategyId: string,
    message: WorkerMessage,
  ): Promise<void> {
    const { type, data } = message;

    switch (type) {
      case 'HEARTBEAT':
        await this.handleHeartbeat(strategyId, data);
        break;

      case 'ENTRY_SIGNAL':
        await this.handleEntrySignal(strategyId, data);
        break;

      case 'ADJUSTMENT_SIGNAL':
        await this.handleAdjustmentSignal(strategyId, data);
        break;

      case 'EXIT_SIGNAL':
        await this.handleExitSignal(strategyId, data);
        break;

      case 'STATE_UPDATE':
        await this.handleStateUpdate(strategyId, data);
        break;

      case 'LOG':
        await this.handleLogMessage(strategyId, data);
        break;

      default:
        this.logger.warn(
          `Unknown message type from strategy ${strategyId}: ${type}`,
        );
    }
  }

  private async handleHeartbeat(strategyId: string, data: any): Promise<void> {
    // Update heartbeat in state
    await this.statePersistence.updateHeartbeat(strategyId);
  }

  private async handleEntrySignal(
    strategyId: string,
    data: any,
  ): Promise<void> {
    // This would trigger order placement through order service
    this.logger.log(`📈 Entry signal from strategy ${strategyId}:`, data);

    // Log signal
    await this.executionLogRepository.save(
      StrategyExecutionLog.signalGenerated(strategyId, 'ENTRY', data),
    );
  }

  private async handleAdjustmentSignal(
    strategyId: string,
    data: any,
  ): Promise<void> {
    this.logger.log(`🔧 Adjustment signal from strategy ${strategyId}:`, data);

    await this.executionLogRepository.save(
      StrategyExecutionLog.createLog({
        strategyId,
        phase: 'ADJUSTMENT',
        action: 'POSITION_UPDATED',
        details: data,
      }),
    );
  }

  private async handleExitSignal(strategyId: string, data: any): Promise<void> {
    this.logger.log(`🔴 Exit signal from strategy ${strategyId}:`, data);

    await this.executionLogRepository.save(
      StrategyExecutionLog.positionClosed(
        strategyId,
        'EXIT',
        data.position || {},
        data.reason || 'SIGNAL',
      ),
    );
  }

  private async handleStateUpdate(
    strategyId: string,
    data: any,
  ): Promise<void> {
    // Update strategy state
    await this.statePersistence.saveStrategyState(strategyId, data);
  }

  private async handleLogMessage(strategyId: string, data: any): Promise<void> {
    // Save log message
    await this.executionLogRepository.save(
      StrategyExecutionLog.createLog({
        strategyId,
        phase: data.phase || 'UNKNOWN',
        action: 'LOG',
        details: data,
      }),
    );
  }

  /**
   * Wait for worker to stop gracefully
   */
  private async waitForWorkerStop(
    strategyWorker: StrategyWorker,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, timeoutMs);

      // Check if worker is still running
      const checkInterval = setInterval(() => {
        if (!this.workers.has(strategyWorker.strategyId)) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Start heartbeat monitoring for all workers
   */
  private startHeartbeatMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkWorkerHealth();
      } catch (error) {
        this.logger.error('Heartbeat monitoring error:', error);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Check health of all workers
   */
  private async checkWorkerHealth(): Promise<void> {
    const now = Date.now();
    const unhealthyWorkers: string[] = [];

    for (const [strategyId, strategyWorker] of this.workers) {
      const timeSinceHeartbeat = now - strategyWorker.lastHeartbeat.getTime();
      const maxAllowedTime =
        this.HEARTBEAT_INTERVAL * this.MAX_MISSED_HEARTBEATS;

      if (timeSinceHeartbeat > maxAllowedTime) {
        strategyWorker.isHealthy = false;
        unhealthyWorkers.push(strategyId);

        this.logger.warn(
          `Strategy ${strategyId} missed heartbeat (${timeSinceHeartbeat}ms)`,
        );
      }
    }

    // Handle unhealthy workers
    for (const strategyId of unhealthyWorkers) {
      try {
        await this.restartStrategy(strategyId);
      } catch (error) {
        this.logger.error(
          `Failed to restart unhealthy strategy ${strategyId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(): Promise<{
    totalWorkers: number;
    healthyWorkers: number;
    unhealthyWorkers: number;
    workerDetails: Array<{
      strategyId: string;
      threadId: number;
      uptime: number;
      isHealthy: boolean;
      lastHeartbeat: Date;
    }>;
  }> {
    const workerDetails = Array.from(this.workers.values()).map((worker) => ({
      strategyId: worker.strategyId,
      threadId: worker.worker.threadId || 0,
      uptime: Date.now() - worker.startTime.getTime(),
      isHealthy: worker.isHealthy,
      lastHeartbeat: worker.lastHeartbeat,
    }));

    const healthyWorkers = workerDetails.filter((w) => w.isHealthy).length;

    return {
      totalWorkers: this.workers.size,
      healthyWorkers,
      unhealthyWorkers: this.workers.size - healthyWorkers,
      workerDetails,
    };
  }

  /**
   * Graceful shutdown of all workers
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down all strategy workers...');

    const shutdownPromises = Array.from(this.workers.keys()).map((strategyId) =>
      this.stopStrategy(strategyId).catch((error) =>
        this.logger.error(`Error stopping strategy ${strategyId}:`, error),
      ),
    );

    await Promise.all(shutdownPromises);
    this.logger.log('✅ All strategy workers shut down');
  }
}
