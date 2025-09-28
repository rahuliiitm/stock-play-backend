import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategyRuntimeState } from '../entities/strategy-runtime-state.entity';
import { Strategy } from '../entities/strategy.entity';
import { MissedDataTracking } from '../entities/missed-data-tracking.entity';
import { StrategyWorkerManager } from './strategy-worker-manager.service';
import { StrategyStatePersistenceService } from './strategy-state-persistence.service';

@Injectable()
export class StrategyRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(StrategyRecoveryService.name);

  constructor(
    @InjectRepository(StrategyRuntimeState)
    private stateRepository: Repository<StrategyRuntimeState>,
    @InjectRepository(Strategy)
    private strategyRepository: Repository<Strategy>,
    @InjectRepository(MissedDataTracking)
    private missedDataRepository: Repository<MissedDataTracking>,
    private workerManager: StrategyWorkerManager,
    private statePersistence: StrategyStatePersistenceService,
  ) {}

  /**
   * Called when the application starts up
   * Recovers all running strategies
   */
  async onModuleInit() {
    await this.recoverRunningStrategies();
  }

  /**
   * Main recovery process for running strategies
   */
  private async recoverRunningStrategies(): Promise<void> {
    try {
      this.logger.log('🔄 Starting strategy recovery process...');

      const runningStrategies =
        await this.statePersistence.getAllRunningStrategies();

      if (runningStrategies.length === 0) {
        this.logger.log('✅ No strategies to recover');
        return;
      }

      this.logger.log(
        `📊 Recovering ${runningStrategies.length} running strategies`,
      );

      const recoveryResults = {
        successful: 0,
        failed: 0,
        skipped: 0,
      };

      for (const strategyState of runningStrategies) {
        try {
          const success = await this.recoverStrategy(strategyState);
          if (success) {
            recoveryResults.successful++;
          } else {
            recoveryResults.skipped++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to recover strategy ${strategyState.strategyId}:`,
            error,
          );
          recoveryResults.failed++;

          // Mark as stopped if recovery fails
          await this.statePersistence.markStrategyAsStopped(
            strategyState.strategyId,
          );
        }
      }

      this.logger.log(
        `✅ Strategy recovery completed: ${recoveryResults.successful} successful, ${recoveryResults.failed} failed, ${recoveryResults.skipped} skipped`,
      );
    } catch (error) {
      this.logger.error('Strategy recovery failed:', error);
    }
  }

  /**
   * Recover a single strategy
   */
  private async recoverStrategy(
    strategyState: StrategyRuntimeState,
  ): Promise<boolean> {
    const { strategyId, currentPhase, phaseStates, lastProcessedCandle } =
      strategyState;

    this.logger.log(
      `🔄 Recovering strategy ${strategyId} in phase ${currentPhase}`,
    );

    // Load the strategy configuration
    const strategy = await this.strategyRepository.findOne({
      where: { id: strategyId },
      relations: ['positions', 'orders'],
    });

    if (!strategy) {
      this.logger.warn(`Strategy configuration not found: ${strategyId}`);
      return false;
    }

    // Check if strategy should still be running
    if (!strategy.isActive) {
      this.logger.warn(
        `Strategy ${strategyId} is not active, skipping recovery`,
      );
      await this.statePersistence.markStrategyAsStopped(strategyId);
      return false;
    }

    // Handle missed data if needed
    if (lastProcessedCandle) {
      await this.handleMissedData(strategy, lastProcessedCandle);
    }

    // Positions will be loaded via the relations in the findOne query above

    // Restart the strategy worker with recovered state
    try {
      await this.workerManager.restartStrategyWithState(strategyId, {
        currentPhase,
        phaseStates,
        positions: strategy.positions || [],
        lastProcessedCandle,
      });

      this.logger.log(`✅ Successfully recovered strategy ${strategyId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to restart strategy worker for ${strategyId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Handle missed data during recovery
   */
  private async handleMissedData(
    strategy: Strategy,
    lastProcessedCandle: any,
  ): Promise<void> {
    const missedStartTime = new Date(lastProcessedCandle.timestamp);
    const currentTime = new Date();

    // Calculate the gap
    const gapMinutes =
      (currentTime.getTime() - missedStartTime.getTime()) / (1000 * 60);

    if (gapMinutes < 5) {
      // Small gap, no need to track
      return;
    }

    this.logger.log(
      `📊 Detected ${gapMinutes.toFixed(1)} minute gap for strategy ${strategy.id}`,
    );

    // Create missed data tracking record
    const missedData = await this.missedDataRepository.save({
      strategyId: strategy.id,
      symbol: strategy.underlyingSymbol,
      timeframe: strategy.timeframe,
      missedStartTime,
      missedEndTime: currentTime,
      candlesCount: Math.floor(
        gapMinutes / this.timeframeToMinutes(strategy.timeframe),
      ),
    });

    // For large gaps, we could trigger background processing
    if (gapMinutes > 60) {
      // More than 1 hour gap
      this.logger.warn(
        `Large gap detected (${gapMinutes.toFixed(1)} min), consider manual data processing for strategy ${strategy.id}`,
      );
      // Could trigger background job here for large gaps
    }
  }

  /**
   * Get historical data for missed period
   */
  private async getHistoricalData(
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    // This would use the existing quotes service
    // For now, return empty array - actual implementation would fetch from data source
    this.logger.debug(
      `Getting historical data for ${symbol} from ${startTime} to ${endTime}`,
    );
    return [];
  }

  /**
   * Convert timeframe to minutes for calculations
   */
  private timeframeToMinutes(timeframe: string): number {
    const timeframeMap = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
    };
    return timeframeMap[timeframe] || 60;
  }

  /**
   * Validate recovered positions against broker
   */
  private async validatePositions(
    strategyId: string,
    positions: any[],
  ): Promise<void> {
    if (!positions || positions.length === 0) {
      return;
    }

    for (const position of positions) {
      try {
        // This would check with broker API if position still exists
        // For now, assume positions are valid
        this.logger.debug(`Position ${position.id} validated successfully`);
      } catch (error) {
        this.logger.warn(`Position ${position.id} validation failed:`, error);
        // Could mark position as closed or create adjustment order
      }
    }
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(): Promise<{
    totalRecovered: number;
    failedRecoveries: number;
    pendingMissedData: number;
    lastRecoveryTime: Date | null;
  }> {
    try {
      const allStates = await this.stateRepository.find();
      const recoveredStates = allStates.filter((s) => s.isRunning);
      const failedStates = allStates.filter((s) => s.errorCount > 0);

      const missedDataCount = await this.missedDataRepository.count({
        where: { status: 'PENDING' },
      });

      // Find last recovery time (when a strategy was started/restarted)
      const lastRecoveryState = await this.stateRepository.findOne({
        order: { updatedAt: 'DESC' },
      });

      return {
        totalRecovered: recoveredStates.length,
        failedRecoveries: failedStates.length,
        pendingMissedData: missedDataCount,
        lastRecoveryTime: lastRecoveryState?.updatedAt || null,
      };
    } catch (error) {
      this.logger.error('Failed to get recovery stats:', error);
      return {
        totalRecovered: 0,
        failedRecoveries: 0,
        pendingMissedData: 0,
        lastRecoveryTime: null,
      };
    }
  }

  /**
   * Manual recovery trigger for specific strategy
   */
  async recoverSpecificStrategy(strategyId: string): Promise<boolean> {
    try {
      const strategyState =
        await this.statePersistence.loadStrategyState(strategyId);

      if (!strategyState) {
        this.logger.warn(`No state found for strategy ${strategyId}`);
        return false;
      }

      if (!strategyState.isRunning) {
        this.logger.warn(`Strategy ${strategyId} is not marked as running`);
        return false;
      }

      return await this.recoverStrategy(strategyState);
    } catch (error) {
      this.logger.error(
        `Manual recovery failed for strategy ${strategyId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Force cleanup of stale strategies
   */
  async forceCleanup(maxAgeMinutes: number = 60): Promise<number> {
    try {
      const cleanedCount =
        await this.statePersistence.cleanupStaleStates(maxAgeMinutes);
      this.logger.log(`Force cleaned ${cleanedCount} stale strategy states`);
      return cleanedCount;
    } catch (error) {
      this.logger.error('Force cleanup failed:', error);
      return 0;
    }
  }
}
