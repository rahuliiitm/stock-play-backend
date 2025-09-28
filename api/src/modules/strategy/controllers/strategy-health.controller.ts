import { Controller, Get, Post, Param } from '@nestjs/common';
import { StrategyStatePersistenceService } from '../services/strategy-state-persistence.service';
import { StrategyWorkerManager } from '../services/strategy-worker-manager.service';
import { StrategyRecoveryService } from '../services/strategy-recovery.service';

@Controller('health/strategies')
export class StrategyHealthController {
  constructor(
    private statePersistence: StrategyStatePersistenceService,
    private workerManager: StrategyWorkerManager,
    private recoveryService: StrategyRecoveryService,
  ) {}

  /**
   * Get overall strategy health
   */
  @Get()
  async getStrategiesHealth() {
    const [healthStats, workerStats, recoveryStats] = await Promise.all([
      this.statePersistence.getHealthStats(),
      this.workerManager.getWorkerStats(),
      this.recoveryService.getRecoveryStats(),
    ]);

    return {
      timestamp: new Date(),
      summary: {
        totalStrategies: healthStats.totalStrategies,
        runningStrategies: healthStats.runningStrategies,
        healthyStrategies: healthStats.healthyStrategies,
        unhealthyStrategies: healthStats.unhealthyStrategies,
        staleStates: healthStats.staleStates,
        activeWorkers: workerStats.totalWorkers,
        healthyWorkers: workerStats.healthyWorkers,
        unhealthyWorkers: workerStats.unhealthyWorkers,
      },
      recovery: recoveryStats,
      workers: workerStats.workerDetails,
      status: this.determineOverallHealth(healthStats, workerStats),
    };
  }

  /**
   * Get specific strategy health
   */
  @Get(':id')
  async getStrategyHealth(@Param('id') strategyId: string) {
    const [state, workerStats] = await Promise.all([
      this.statePersistence.loadStrategyState(strategyId),
      this.workerManager.getWorkerStats(),
    ]);

    if (!state) {
      return {
        strategyId,
        status: 'NOT_FOUND',
        message: 'Strategy state not found',
      };
    }

    const worker = workerStats.workerDetails.find(
      (w) => w.strategyId === strategyId,
    );
    const isHealthy = this.isStrategyHealthy(state, worker);

    return {
      strategyId,
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      isRunning: state.isRunning,
      currentPhase: state.currentPhase,
      lastHeartbeat: state.lastHeartbeat,
      timeSinceHeartbeat: Date.now() - state.lastHeartbeat.getTime(),
      errorCount: state.errorCount,
      restartCount: state.restartCount,
      workerInfo: worker
        ? {
            threadId: worker.threadId,
            uptime: worker.uptime,
            isHealthy: worker.isHealthy,
          }
        : null,
      healthMetrics: {
        heartbeatAge: Math.floor(
          (Date.now() - state.lastHeartbeat.getTime()) / 1000,
        ),
        errorRate: state.errorCount / Math.max(state.restartCount + 1, 1),
        restartFrequency: state.restartCount,
      },
    };
  }

  /**
   * Restart unhealthy strategy
   */
  @Post(':id/restart')
  async restartStrategy(@Param('id') strategyId: string) {
    try {
      await this.workerManager.restartStrategy(strategyId);
      return {
        success: true,
        message: `Strategy ${strategyId} restart initiated`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to restart strategy: ${error.message}`,
      };
    }
  }

  /**
   * Get system diagnostics
   */
  @Get('diagnostics')
  async getSystemDiagnostics() {
    const [healthStats, workerStats, consistencyCheck, recoveryStats] =
      await Promise.all([
        this.statePersistence.getHealthStats(),
        this.workerManager.getWorkerStats(),
        this.statePersistence.validateStateConsistency(),
        this.recoveryService.getRecoveryStats(),
      ]);

    return {
      timestamp: new Date(),
      system: {
        status: this.determineOverallHealth(healthStats, workerStats),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
      strategies: healthStats,
      workers: workerStats,
      consistency: consistencyCheck,
      recovery: recoveryStats,
      recommendations: this.generateRecommendations(
        healthStats,
        workerStats,
        consistencyCheck,
      ),
    };
  }

  private determineOverallHealth(healthStats: any, workerStats: any): string {
    const totalStrategies = healthStats.totalStrategies;
    const healthyStrategies = healthStats.healthyStrategies;
    const healthyWorkers = workerStats.healthyWorkers;
    const totalWorkers = workerStats.totalWorkers;

    if (totalStrategies === 0) return 'NO_STRATEGIES';

    const strategyHealthRate = healthyStrategies / totalStrategies;
    const workerHealthRate =
      totalWorkers > 0 ? healthyWorkers / totalWorkers : 1;

    if (strategyHealthRate >= 0.9 && workerHealthRate >= 0.9)
      return 'EXCELLENT';
    if (strategyHealthRate >= 0.8 && workerHealthRate >= 0.8) return 'GOOD';
    if (strategyHealthRate >= 0.6 && workerHealthRate >= 0.6) return 'FAIR';
    if (strategyHealthRate >= 0.3 || workerHealthRate >= 0.3) return 'POOR';

    return 'CRITICAL';
  }

  private isStrategyHealthy(state: any, worker: any): boolean {
    if (!state.isRunning) return true; // Stopped strategies are considered healthy

    const timeSinceHeartbeat = Date.now() - state.lastHeartbeat.getTime();
    const heartbeatHealthy = timeSinceHeartbeat < 5 * 60 * 1000; // 5 minutes

    const workerHealthy = !worker || worker.isHealthy;

    return heartbeatHealthy && workerHealthy;
  }

  private generateRecommendations(
    healthStats: any,
    workerStats: any,
    consistency: any,
  ): string[] {
    const recommendations: string[] = [];

    if (healthStats.unhealthyStrategies > 0) {
      recommendations.push(
        `${healthStats.unhealthyStrategies} strategies are unhealthy and may need restart`,
      );
    }

    if (workerStats.unhealthyWorkers > 0) {
      recommendations.push(
        `${workerStats.unhealthyWorkers} workers are unhealthy`,
      );
    }

    if (consistency.inconsistent > 0) {
      recommendations.push(
        `${consistency.inconsistent} strategy states are inconsistent between Redis and database`,
      );
    }

    if (consistency.missingInDb > 0) {
      recommendations.push(
        `${consistency.missingInDb} states missing in database`,
      );
    }

    if (consistency.missingInRedis > 0) {
      recommendations.push(
        `${consistency.missingInRedis} states missing in Redis - consider reloading from database`,
      );
    }

    if (healthStats.staleStates > 0) {
      recommendations.push(
        `${healthStats.staleStates} stale states detected - consider cleanup`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally');
    }

    return recommendations;
  }
}
