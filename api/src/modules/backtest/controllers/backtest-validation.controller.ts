import {
  Controller,
  Post,
  Body,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BacktestValidationService } from '../services/backtest-validation.service';
import { BacktestSafetyService } from '../services/backtest-safety.service';
import type { BacktestConfig } from '../interfaces/backtest-config.interface';

@Controller('backtest/validation')
export class BacktestValidationController {
  constructor(
    private readonly validationService: BacktestValidationService,
    private readonly safetyService: BacktestSafetyService,
  ) {}

  @Post('config')
  async validateConfig(@Body() config: BacktestConfig): Promise<{
    validation: any;
    safety: any;
    canProceed: boolean;
    summary: string;
  }> {
    try {
      // Validate configuration
      const validation = this.validationService.validateBacktestConfig(config);

      // Perform safety checks
      const safety = await this.safetyService.performSafetyChecks(config);

      // Check if can proceed
      const canProceed = this.safetyService.canProceedSafely(safety);

      // Generate summary
      const summary = this.generateSummary(validation, safety, canProceed);

      return {
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: this.validationService.getValidationSummary(validation),
        },
        safety: {
          overallSafe: safety.overallSafe,
          checks: safety.checks,
          recommendations: safety.recommendations,
          summary: this.safetyService.getSafetySummary(safety),
        },
        canProceed,
        summary,
      };
    } catch (error) {
      throw new HttpException(
        `Validation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('safety-check')
  async performSafetyCheck(@Body() config: BacktestConfig): Promise<{
    safety: any;
    canProceed: boolean;
    summary: string;
  }> {
    try {
      const safety = await this.safetyService.performSafetyChecks(config);
      const canProceed = this.safetyService.canProceedSafely(safety);
      const summary = this.generateSafetySummary(safety, canProceed);

      return {
        safety: {
          overallSafe: safety.overallSafe,
          checks: safety.checks,
          recommendations: safety.recommendations,
          summary: this.safetyService.getSafetySummary(safety),
        },
        canProceed,
        summary,
      };
    } catch (error) {
      throw new HttpException(
        `Safety check failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('guidelines')
  getValidationGuidelines(): any {
    return {
      configuration: {
        required: [
          'Symbol must be specified',
          'Timeframe must be valid (1m, 5m, 15m, 30m, 1h, 4h, 1d)',
          'Start date and end date must be specified',
          'Initial balance must be positive',
        ],
        recommended: [
          'Use at least 30 days of data',
          'Set reasonable initial balance (₹10,000 - ₹1,00,00,000)',
          'Ensure data quality and completeness',
        ],
      },
      strategy: {
        ema: [
          'Fast period must be less than slow period',
          'Both periods should be between 1 and 200',
          'Avoid extreme values (fast < 2, slow > 100)',
        ],
        risk: [
          'Set maxLossPerLot to limit risk',
          'Use reasonable trailing stop multiplier (0.5-3)',
          'Avoid unlimited risk settings',
        ],
        pyramiding: [
          'Max lots should be reasonable (1-15)',
          'Multiplier should be moderate (0.5-2)',
          'Avoid excessive pyramiding',
        ],
      },
      safety: {
        critical: [
          'No unlimited risk (maxLossPerLot = 0)',
          'No excessive pyramiding (maxLots > 15)',
          'No future dates',
          'Sufficient data available',
        ],
        high: [
          'Enable gap filtering',
          'Reasonable RSI thresholds',
          'Appropriate EMA periods',
          'Moderate pyramiding settings',
        ],
      },
    };
  }

  @Get('common-errors')
  getCommonErrors(): any {
    return {
      configuration: [
        'Symbol not specified or invalid',
        'Invalid timeframe (must be 1m, 5m, 15m, 30m, 1h, 4h, 1d)',
        'Start date after end date',
        'Initial balance zero or negative',
        'Date range too short (< 1 day)',
        'Date range too long (> 5 years)',
      ],
      strategy: [
        'EMA fast period >= slow period',
        'EMA periods out of range (1-200)',
        'ATR period out of range (1-100)',
        'RSI threshold out of range (0-100)',
        'ADX threshold out of range (0-100)',
        'Negative gap thresholds',
        'Excessive pyramiding settings',
      ],
      safety: [
        'Unlimited risk (maxLossPerLot = 0)',
        'Excessive pyramiding (maxLots > 15)',
        'No gap filtering enabled',
        'Extreme RSI thresholds',
        'Very high initial balance',
        'Future dates in range',
      ],
    };
  }

  /**
   * Generate comprehensive summary
   */
  private generateSummary(
    validation: any,
    safety: any,
    canProceed: boolean,
  ): string {
    const validationStatus = validation.isValid ? '✅' : '❌';
    const safetyStatus = safety.overallSafe ? '✅' : '❌';
    const proceedStatus = canProceed ? '✅' : '❌';

    return `
🔍 BACKTEST VALIDATION SUMMARY
═══════════════════════════════════════

📋 CONFIGURATION: ${validationStatus}
${validation.isValid ? 'All configuration parameters are valid' : `${validation.errors.length} errors found`}
${validation.warnings.length > 0 ? `⚠️ ${validation.warnings.length} warnings` : ''}

🛡️ SAFETY: ${safetyStatus}
${safety.overallSafe ? 'All safety checks passed' : `${safety.checks.filter((c) => c.severity === 'CRITICAL').length} critical issues`}
${safety.checks.filter((c) => c.severity === 'HIGH').length > 0 ? `⚠️ ${safety.checks.filter((c) => c.severity === 'HIGH').length} high-severity issues` : ''}

🚀 CAN PROCEED: ${proceedStatus}
${canProceed ? 'Backtest can proceed safely' : 'Backtest blocked due to safety issues'}

${!canProceed ? '❌ FIX REQUIRED: Address critical issues before running backtest' : ''}
    `.trim();
  }

  /**
   * Generate safety summary
   */
  private generateSafetySummary(safety: any, canProceed: boolean): string {
    const criticalCount = safety.checks.filter(
      (c) => c.severity === 'CRITICAL',
    ).length;
    const highCount = safety.checks.filter((c) => c.severity === 'HIGH').length;
    const mediumCount = safety.checks.filter(
      (c) => c.severity === 'MEDIUM',
    ).length;

    return `
🛡️ SAFETY CHECK SUMMARY
═══════════════════════════════════════

${criticalCount > 0 ? `🚨 CRITICAL: ${criticalCount} issues - BACKTEST BLOCKED` : ''}
${highCount > 0 ? `⚠️ HIGH: ${highCount} issues - proceed with caution` : ''}
${mediumCount > 0 ? `ℹ️ MEDIUM: ${mediumCount} issues - review recommended` : ''}
${criticalCount === 0 && highCount === 0 && mediumCount === 0 ? '✅ All safety checks passed' : ''}

${!canProceed ? '❌ BACKTEST BLOCKED: Fix critical issues before proceeding' : ''}
${canProceed && (highCount > 0 || mediumCount > 0) ? '⚠️ PROCEED WITH CAUTION: Review high/medium issues' : ''}
${canProceed && highCount === 0 && mediumCount === 0 ? '✅ SAFE TO PROCEED: All safety checks passed' : ''}
    `.trim();
  }
}
