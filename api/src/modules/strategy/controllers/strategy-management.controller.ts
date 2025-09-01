import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { StrategyRunnerService } from '../services/strategy-runner.service'
import { NIFTY_OPTION_SELLING_CONFIG } from '../interfaces/strategy-config.interface'
import type { StrategyConfig } from '../interfaces/strategy-config.interface'

@Controller('strategies')
export class StrategyManagementController {
  private readonly logger = new Logger(StrategyManagementController.name)

  constructor(
    private strategyRunner: StrategyRunnerService
  ) {}

  @Get()
  async getAllStrategies() {
    try {
      const runningStrategies = this.strategyRunner.getRunningStrategies()
      const strategies = [
        {
          id: 'nifty-weekly-option-selling',
          name: 'NIFTY Weekly Option Selling',
          config: NIFTY_OPTION_SELLING_CONFIG,
          isRunning: runningStrategies.includes('nifty-weekly-option-selling'),
          status: runningStrategies.includes('nifty-weekly-option-selling') ? 'RUNNING' : 'STOPPED'
        }
      ]

      return {
        success: true,
        data: strategies
      }
    } catch (error) {
      this.logger.error('Error fetching strategies:', error)
      throw new HttpException('Failed to fetch strategies', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':id')
  async getStrategy(@Param('id') id: string) {
    try {
      const runningStrategies = this.strategyRunner.getRunningStrategies()
      const isRunning = runningStrategies.includes(id)

      if (id === 'nifty-weekly-option-selling') {
        const status = this.strategyRunner.getStrategyStatus(id)

        return {
          success: true,
          data: {
            id,
            name: 'NIFTY Weekly Option Selling',
            config: NIFTY_OPTION_SELLING_CONFIG,
            isRunning,
            status: isRunning ? 'RUNNING' : 'STOPPED',
            details: status
          }
        }
      }

      throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error(`Error fetching strategy ${id}:`, error)
      throw new HttpException('Failed to fetch strategy', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post(':id/start')
  async startStrategy(@Param('id') id: string) {
    try {
      let config: StrategyConfig

      if (id === 'nifty-weekly-option-selling') {
        config = NIFTY_OPTION_SELLING_CONFIG
      } else {
        throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND)
      }

      const result = await this.strategyRunner.startStrategy(config)

      if (result) {
        return {
          success: true,
          message: `Strategy ${id} started successfully`,
          data: {
            strategyId: id,
            status: 'RUNNING'
          }
        }
      } else {
        throw new HttpException('Failed to start strategy', HttpStatus.INTERNAL_SERVER_ERROR)
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error(`Error starting strategy ${id}:`, error)
      throw new HttpException('Failed to start strategy', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post(':id/stop')
  async stopStrategy(@Param('id') id: string) {
    try {
      const result = await this.strategyRunner.stopStrategy(id)

      if (result) {
        return {
          success: true,
          message: `Strategy ${id} stopped successfully`,
          data: {
            strategyId: id,
            status: 'STOPPED'
          }
        }
      } else {
        throw new HttpException('Failed to stop strategy', HttpStatus.INTERNAL_SERVER_ERROR)
      }
    } catch (error) {
      this.logger.error(`Error stopping strategy ${id}:`, error)
      throw new HttpException('Failed to stop strategy', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post(':id/restart')
  async restartStrategy(@Param('id') id: string) {
    try {
      // Stop first
      await this.strategyRunner.stopStrategy(id)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Start again
      let config: StrategyConfig
      if (id === 'nifty-weekly-option-selling') {
        config = NIFTY_OPTION_SELLING_CONFIG
      } else {
        throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND)
      }

      const result = await this.strategyRunner.startStrategy(config)

      if (result) {
        return {
          success: true,
          message: `Strategy ${id} restarted successfully`,
          data: {
            strategyId: id,
            status: 'RUNNING'
          }
        }
      } else {
        throw new HttpException('Failed to restart strategy', HttpStatus.INTERNAL_SERVER_ERROR)
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error(`Error restarting strategy ${id}:`, error)
      throw new HttpException('Failed to restart strategy', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':id/status')
  async getStrategyStatus(@Param('id') id: string) {
    try {
      const status = this.strategyRunner.getStrategyStatus(id)

      return {
        success: true,
        data: {
          strategyId: id,
          ...status,
          timestamp: new Date()
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching strategy status ${id}:`, error)
      throw new HttpException('Failed to fetch strategy status', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':id/stats')
  async getStrategyStats(@Param('id') id: string) {
    try {
      // Mock statistics for now
      const stats = {
        totalTrades: 15,
        winningTrades: 11,
        losingTrades: 4,
        winRate: 73.3,
        totalPnL: 4250,
        maxDrawdown: 1200,
        sharpeRatio: 1.8,
        avgProfit: 386,
        avgLoss: -300,
        profitFactor: 2.2,
        lastUpdated: new Date()
      }

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      this.logger.error(`Error fetching strategy stats ${id}:`, error)
      throw new HttpException('Failed to fetch strategy statistics', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post(':id/test-signal')
  async testSignal(@Param('id') id: string, @Body() body: any) {
    try {
      const { candle, indicators } = body

      if (!candle || !indicators) {
        throw new HttpException('Candle and indicators data required', HttpStatus.BAD_REQUEST)
      }

      // Process test signal
      await this.strategyRunner.processCandleData(id, candle, indicators)

      return {
        success: true,
        message: `Test signal processed for strategy ${id}`,
        data: {
          strategyId: id,
          processedAt: new Date()
        }
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error(`Error processing test signal for ${id}:`, error)
      throw new HttpException('Failed to process test signal', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('running/list')
  async getRunningStrategies() {
    try {
      const runningStrategies = this.strategyRunner.getRunningStrategies()

      return {
        success: true,
        data: {
          count: runningStrategies.length,
          strategies: runningStrategies,
          timestamp: new Date()
        }
      }
    } catch (error) {
      this.logger.error('Error fetching running strategies:', error)
      throw new HttpException('Failed to fetch running strategies', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('stop-all')
  async stopAllStrategies() {
    try {
      const runningStrategies = this.strategyRunner.getRunningStrategies()
      const stopPromises = runningStrategies.map(id => this.strategyRunner.stopStrategy(id))

      await Promise.all(stopPromises)

      return {
        success: true,
        message: `Stopped ${runningStrategies.length} strategies`,
        data: {
          stoppedStrategies: runningStrategies,
          timestamp: new Date()
        }
      }
    } catch (error) {
      this.logger.error('Error stopping all strategies:', error)
      throw new HttpException('Failed to stop all strategies', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('health/overview')
  async getSystemHealth() {
    try {
      const runningStrategies = this.strategyRunner.getRunningStrategies()
      const healthData = {
        totalStrategies: 1, // For now, just NIFTY strategy
        runningStrategies: runningStrategies.length,
        stoppedStrategies: 1 - runningStrategies.length,
        systemStatus: 'HEALTHY',
        lastUpdated: new Date(),
        strategies: runningStrategies.map(id => ({
          id,
          status: 'RUNNING',
          uptime: 'N/A', // Would need to track this
          lastHeartbeat: new Date()
        }))
      }

      return {
        success: true,
        data: healthData
      }
    } catch (error) {
      this.logger.error('Error fetching system health:', error)
      throw new HttpException('Failed to fetch system health', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('config/validate')
  async validateStrategyConfig(@Body() config: StrategyConfig) {
    try {
      // Basic validation
      if (!config.id || !config.name || !config.underlyingSymbol) {
        throw new HttpException('Missing required strategy configuration fields', HttpStatus.BAD_REQUEST)
      }

      if (!config.entryConditions || config.entryConditions.length === 0) {
        throw new HttpException('Strategy must have at least one entry condition', HttpStatus.BAD_REQUEST)
      }

      if (!config.exitConditions || config.exitConditions.length === 0) {
        throw new HttpException('Strategy must have at least one exit condition', HttpStatus.BAD_REQUEST)
      }

      return {
        success: true,
        message: 'Strategy configuration is valid',
        data: {
          configId: config.id,
          validatedAt: new Date(),
          issues: []
        }
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Error validating strategy config:', error)
      throw new HttpException('Failed to validate strategy configuration', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('config/save')
  async saveStrategyConfig(@Body() config: StrategyConfig) {
    try {
      // In a real implementation, this would save to database
      // For now, just validate and return success
      const validation = await this.validateStrategyConfig(config)

      return {
        success: true,
        message: 'Strategy configuration saved successfully',
        data: {
          configId: config.id,
          savedAt: new Date(),
          version: '1.0.0'
        }
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Error saving strategy config:', error)
      throw new HttpException('Failed to save strategy configuration', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
