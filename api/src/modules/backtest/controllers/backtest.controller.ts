import { Controller, Post, Body, Get, Param, Query, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common'
import { BacktestOrchestratorService } from '../services/backtest-orchestrator.service'
import { BacktestValidationService, ValidationResult } from '../services/backtest-validation.service'
import { BacktestSafetyService, SafetyReport } from '../services/backtest-safety.service'
import { BacktestMetricsService } from '../services/backtest-metrics.service'
import type { BacktestConfig, BacktestResult as BacktestResultInterface } from '../interfaces/backtest-config.interface'

@Controller('backtest')
export class BacktestController {
  private readonly logger = new Logger(BacktestController.name)

  constructor(
    private readonly backtestOrchestrator: BacktestOrchestratorService,
    private readonly validationService: BacktestValidationService,
    private readonly safetyService: BacktestSafetyService,
    private readonly metricsService: BacktestMetricsService
  ) {}

  @Post('run')
  async runBacktest(@Body() config: BacktestConfig): Promise<BacktestResultInterface> {
    try {
      // Validate configuration
      const validation = this.validationService.validateBacktestConfig(config)
      if (!validation.isValid) {
        throw new HttpException(
          `Configuration validation failed: ${validation.errors.join(', ')}`,
          HttpStatus.BAD_REQUEST
        )
      }

      // Perform safety checks
      const safetyReport = await this.safetyService.performSafetyChecks(config)
      if (!this.safetyService.canProceedSafely(safetyReport)) {
        throw new HttpException(
          `Safety checks failed: ${safetyReport.checks.filter(c => c.severity === 'CRITICAL').map(c => c.message).join(', ')}`,
          HttpStatus.BAD_REQUEST
        )
      }

      // Run backtest
      const result = await this.backtestOrchestrator.runBacktest(config)

      // Calculate comprehensive metrics
      const metrics = this.metricsService.calculateMetrics(result)

      return result
    } catch (error) {
      throw new HttpException(
        `Backtest failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post('validate')
  async validateConfig(@Body() config: BacktestConfig): Promise<{
    validation: any
    safety: any
    canProceed: boolean
  }> {
    try {
      const validation = this.validationService.validateBacktestConfig(config)
      const safety = await this.safetyService.performSafetyChecks(config)
      const canProceed = this.safetyService.canProceedSafely(safety)

      return {
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: this.validationService.getValidationSummary(validation)
        },
        safety: {
          overallSafe: safety.overallSafe,
          checks: safety.checks,
          recommendations: safety.recommendations,
          summary: this.safetyService.getSafetySummary(safety)
        },
        canProceed
      }
    } catch (error) {
      throw new HttpException(
        `Validation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('example-config')
  getExampleConfig(): BacktestConfig {
    return {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      initialBalance: 1000000,
      strategyConfig: {
        id: 'example-strategy',
        name: 'EMA Gap ATR Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 20,
        atrPeriod: 14,
        minGapThreshold: 0,
        minGapMultiplier: 0.3,
        slopeLookback: 3,
        slopeMin: 0,
        rsiPeriod: 14,
        rsiThreshold: 50,
        adxPeriod: 14,
        adxThreshold: 25,
        pyramiding: {
          multiplier: 0.6,
          maxLots: 3
        },
        risk: {
          maxLossPerLot: 10000,
          trailingAtrMultiplier: 1
        },
        options: {
          enabled: true,
          strikeSelection: {
            callStrikes: ['ATM', 'ATM+1'],
            putStrikes: ['ATM', 'ATM-1'],
            expiryDays: 7
          },
          lotSize: 50,
          strikeIncrement: 50
        }
      }
    }
  }

  @Post('run-nifty')
  async runNIFTYBacktest(@Body() config: BacktestConfig): Promise<BacktestResultInterface> {
    try {
      this.logger.log('Received NIFTY backtest request')

      // Validate configuration
      const validationResult: ValidationResult = this.validationService.validateBacktestConfig(config as BacktestConfig || {} as BacktestConfig)
      if (!validationResult.isValid) {
        throw new BadRequestException(`Invalid configuration: ${validationResult.errors.join(', ')}`)
      }

      // Perform safety checks
      const safetyResult: SafetyReport = await this.safetyService.performSafetyChecks(config as BacktestConfig || {} as BacktestConfig)
      if (!safetyResult.overallSafe) {
        const criticalIssues = safetyResult.checks.filter(check => check.severity === 'CRITICAL').map(check => check.message)
        const highIssues = safetyResult.checks.filter(check => check.severity === 'HIGH').map(check => check.message)
        const allIssues = [...criticalIssues, ...highIssues]
        throw new BadRequestException(`Safety check failed: ${allIssues.join(', ')}`)
      }

      // Run the backtest
      const result = await this.backtestOrchestrator.runNIFTYBacktest(config)

      this.logger.log('NIFTY backtest completed successfully')
      return result

    } catch (error) {
      this.logger.error('Failed to run NIFTY backtest:', error)

      if (error instanceof BadRequestException) {
        throw error
      }

      throw new HttpException(
        error.message || `Backtest failed: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('safety-guidelines')
  getSafetyGuidelines(): any {
    return {
      critical: [
        'Never set maxLossPerLot to 0 (unlimited risk)',
        'Avoid excessive pyramiding (maxLots > 15)',
        'Ensure sufficient data (minimum 30 days)',
        'Set reasonable initial balance (₹10,000 - ₹1,00,00,000)'
      ],
      high: [
        'Enable gap filtering to reduce false signals',
        'Set appropriate RSI thresholds (20-80)',
        'Use reasonable EMA periods (fast < slow)',
        'Avoid extreme pyramiding multipliers (>2)'
      ],
      medium: [
        'Use at least 1 week of data for reliable results',
        'Check for data gaps and anomalies',
        'Validate data quality before backtesting',
        'Review risk parameters regularly'
      ],
      recommendations: [
        'Start with small position sizes',
        'Test with paper trading first',
        'Monitor drawdown limits',
        'Keep detailed logs of all trades',
        'Regularly review and update strategy parameters'
      ]
    }
  }
}
