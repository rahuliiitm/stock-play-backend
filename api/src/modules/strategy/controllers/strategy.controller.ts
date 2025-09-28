import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from '../entities/strategy.entity';
import { StrategyRuntimeState } from '../entities/strategy-runtime-state.entity';
import { StrategyWorkerManager } from '../services/strategy-worker-manager.service';
import { StrategyStatePersistenceService } from '../services/strategy-state-persistence.service';

@Controller('strategies')
export class StrategyController {
  constructor(
    @InjectRepository(Strategy)
    private strategyRepository: Repository<Strategy>,
    @InjectRepository(StrategyRuntimeState)
    private stateRepository: Repository<StrategyRuntimeState>,
    private workerManager: StrategyWorkerManager,
    private statePersistence: StrategyStatePersistenceService,
  ) {}

  /**
   * Get all strategies
   */
  @Get()
  async getAllStrategies(
    @Query('status') status?: string,
  ): Promise<Strategy[]> {
    const query = this.strategyRepository
      .createQueryBuilder('strategy')
      .leftJoinAndSelect('strategy.runtimeState', 'runtimeState')
      .orderBy('strategy.createdAt', 'DESC');

    if (status === 'running') {
      query.andWhere('runtimeState.isRunning = :isRunning', {
        isRunning: true,
      });
    } else if (status === 'stopped') {
      query.andWhere(
        '(runtimeState.isRunning = :isRunning OR runtimeState.isRunning IS NULL)',
        { isRunning: false },
      );
    }

    return query.getMany();
  }

  /**
   * Get strategy by ID
   */
  @Get(':id')
  async getStrategy(@Param('id') id: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({
      where: { id },
      relations: ['runtimeState', 'positions', 'orders'],
    });

    if (!strategy) {
      throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
    }

    return strategy;
  }

  /**
   * Create new strategy
   */
  @Post()
  async createStrategy(
    @Body() strategyData: Partial<Strategy>,
  ): Promise<Strategy> {
    try {
      // Validate required fields
      if (!strategyData.name || !strategyData.underlyingSymbol) {
        throw new HttpException(
          'Name and underlying symbol are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Set defaults
      const strategy = this.strategyRepository.create({
        ...strategyData,
        isActive: strategyData.isActive ?? true,
        configType: strategyData.configType ?? 'RULE_BASED',
        config: strategyData.config ?? {},
        orderStrategy: strategyData.orderStrategy ?? {},
        riskManagement: strategyData.riskManagement ?? {},
      });

      const savedStrategy = await this.strategyRepository.save(strategy);

      // Create initial runtime state
      const runtimeState = this.stateRepository.create({
        strategyId: savedStrategy.id,
        isRunning: false,
        currentPhase: 'ENTRY',
        errorCount: 0,
        restartCount: 0,
      });

      await this.stateRepository.save(runtimeState);

      return this.getStrategy(savedStrategy.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create strategy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update strategy
   */
  @Put(':id')
  async updateStrategy(
    @Param('id') id: string,
    @Body() updateData: Partial<Strategy>,
  ): Promise<Strategy> {
    const strategy = await this.getStrategy(id);

    // Prevent updates to running strategies unless it's just status/config changes
    if (
      strategy.isRunning() &&
      updateData.config &&
      Object.keys(updateData.config).length > 0
    ) {
      throw new HttpException(
        'Cannot update strategy configuration while running. Stop the strategy first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.strategyRepository.update(id, updateData);
      return this.getStrategy(id);
    } catch (error) {
      throw new HttpException(
        'Failed to update strategy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete strategy
   */
  @Delete(':id')
  async deleteStrategy(@Param('id') id: string): Promise<{ success: boolean }> {
    const strategy = await this.getStrategy(id);

    // Don't allow deletion of running strategies
    if (strategy.isRunning()) {
      throw new HttpException(
        'Cannot delete running strategy. Stop the strategy first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.strategyRepository.remove(strategy);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        'Failed to delete strategy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Start strategy
   */
  @Post(':id/start')
  async startStrategy(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.workerManager.startStrategy(id);
      return {
        success: true,
        message: `Strategy ${id} started successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to start strategy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Stop strategy
   */
  @Post(':id/stop')
  async stopStrategy(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.workerManager.stopStrategy(id);
      return {
        success: true,
        message: `Strategy ${id} stopped successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to stop strategy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Restart strategy
   */
  @Post(':id/restart')
  async restartStrategy(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.workerManager.restartStrategy(id);
      return {
        success: true,
        message: `Strategy ${id} restarted successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to restart strategy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get strategy status
   */
  @Get(':id/status')
  async getStrategyStatus(@Param('id') id: string): Promise<{
    strategyId: string;
    isRunning: boolean;
    currentPhase: string;
    lastHeartbeat?: Date;
    errorCount: number;
    restartCount: number;
    positionsCount: number;
    uptime?: number;
  }> {
    const strategy = await this.getStrategy(id);

    if (!strategy.runtimeState) {
      return {
        strategyId: id,
        isRunning: false,
        currentPhase: 'ENTRY',
        errorCount: 0,
        restartCount: 0,
        positionsCount: 0,
      };
    }

    const workerStats = await this.workerManager.getWorkerStats();
    const worker = workerStats.workerDetails.find((w) => w.strategyId === id);

    return {
      strategyId: id,
      isRunning: strategy.runtimeState.isRunning,
      currentPhase: strategy.runtimeState.currentPhase,
      lastHeartbeat: strategy.runtimeState.lastHeartbeat,
      errorCount: strategy.runtimeState.errorCount,
      restartCount: strategy.runtimeState.restartCount,
      positionsCount: strategy.positions?.length || 0,
      uptime: worker ? worker.uptime : undefined,
    };
  }

  /**
   * Get strategy state
   */
  @Get(':id/state')
  async getStrategyState(
    @Param('id') id: string,
  ): Promise<StrategyRuntimeState | null> {
    return this.statePersistence.loadStrategyState(id);
  }

  /**
   * Reset strategy state (for recovery/testing)
   */
  @Post(':id/state/reset')
  async resetStrategyState(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const strategy = await this.getStrategy(id);

    if (strategy.isRunning()) {
      throw new HttpException(
        'Cannot reset state of running strategy. Stop the strategy first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.statePersistence.saveStrategyState(id, {
        isRunning: false,
        currentPhase: 'ENTRY',
        errorCount: 0,
        lastError: undefined,
        phaseStates: {},
        lastProcessedCandle: undefined,
      });

      return { success: true };
    } catch (error) {
      throw new HttpException(
        'Failed to reset strategy state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get strategy logs
   */
  @Get(':id/logs')
  async getStrategyLogs(
    @Param('id') id: string,
    @Query('limit') limit: number = 50,
    @Query('phase') phase?: string,
    @Query('action') action?: string,
  ): Promise<any[]> {
    // This would be implemented with the execution logs
    // For now, return empty array
    return [];
  }

  /**
   * Get strategy performance
   */
  @Get(':id/performance')
  async getStrategyPerformance(@Param('id') id: string): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    avgProfit: number;
    avgLoss: number;
    largestWin: number;
    largestLoss: number;
  }> {
    const strategy = await this.getStrategy(id);

    if (!strategy.positions || strategy.positions.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgProfit: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
      };
    }

    const closedPositions = strategy.positions.filter(
      (p) => p.status === 'CLOSED',
    );

    const winningTrades = closedPositions.filter((p) => p.pnl > 0);
    const losingTrades = closedPositions.filter((p) => p.pnl < 0);

    const totalPnL = closedPositions.reduce((sum, p) => sum + p.pnl, 0);
    const avgProfit =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, p) => sum + p.pnl, 0) /
          winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, p) => sum + p.pnl, 0) / losingTrades.length
        : 0;

    const largestWin =
      winningTrades.length > 0
        ? Math.max(...winningTrades.map((p) => p.pnl))
        : 0;
    const largestLoss =
      losingTrades.length > 0 ? Math.min(...losingTrades.map((p) => p.pnl)) : 0;

    return {
      totalTrades: closedPositions.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        closedPositions.length > 0
          ? (winningTrades.length / closedPositions.length) * 100
          : 0,
      totalPnL,
      avgProfit,
      avgLoss,
      largestWin,
      largestLoss,
    };
  }
}
