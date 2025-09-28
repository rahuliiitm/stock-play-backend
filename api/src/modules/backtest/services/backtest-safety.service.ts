import { Injectable, Logger } from '@nestjs/common';
import { BacktestConfig } from '../interfaces/backtest-config.interface';

export interface SafetyCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SafetyReport {
  overallSafe: boolean;
  checks: SafetyCheck[];
  recommendations: string[];
}

/**
 * Backtest Safety Service
 *
 * This service performs safety checks to prevent dangerous backtest configurations
 * that could lead to financial losses. It implements circuit breakers and safety
 * mechanisms to protect users from harmful settings.
 */
@Injectable()
export class BacktestSafetyService {
  private readonly logger = new Logger(BacktestSafetyService.name);

  /**
   * Perform comprehensive safety checks
   */
  async performSafetyChecks(config: BacktestConfig): Promise<SafetyReport> {
    const checks: SafetyCheck[] = [];
    const recommendations: string[] = [];

    // Check for dangerous parameter combinations
    checks.push(...this.checkParameterSafety(config));

    // Check for excessive risk
    checks.push(...this.checkRiskSafety(config));

    // Check for data quality issues
    checks.push(...this.checkDataSafety(config));

    // Check for computational limits
    checks.push(...this.checkComputationalSafety(config));

    // Generate recommendations based on failed checks
    recommendations.push(...this.generateRecommendations(checks));

    const overallSafe = checks.every(
      (check) => check.severity !== 'CRITICAL' && check.severity !== 'HIGH',
    );

    return {
      overallSafe,
      checks,
      recommendations,
    };
  }

  /**
   * Check parameter safety
   */
  private checkParameterSafety(config: BacktestConfig): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    // Check for extreme EMA periods
    if (config.strategyConfig.emaFastPeriod < 2) {
      checks.push({
        name: 'EMA Fast Period Too Low',
        passed: false,
        message: 'EMA fast period is too low, may cause excessive noise',
        severity: 'HIGH',
      });
    }

    if (config.strategyConfig.emaSlowPeriod > 100) {
      checks.push({
        name: 'EMA Slow Period Too High',
        passed: false,
        message: 'EMA slow period is too high, may cause delayed signals',
        severity: 'MEDIUM',
      });
    }

    // Check for dangerous entry settings (v2 parameters)
    if (
      config.strategyConfig &&
      config.strategyConfig.atrMultiplierEntry === 0 &&
      config.strategyConfig.strongCandleThreshold === 0
    ) {
      checks.push({
        name: 'No Entry Filtering',
        passed: false,
        message: 'No entry filtering enabled - may generate excessive signals',
        severity: 'HIGH',
      });
    }

    // Check for extreme RSI settings (v2 parameters)
    if (
      config.strategyConfig &&
      (config.strategyConfig.rsiEntryLong < 20 ||
        config.strategyConfig.rsiEntryLong > 80 ||
        config.strategyConfig.rsiEntryShort < 20 ||
        config.strategyConfig.rsiEntryShort > 80)
    ) {
      checks.push({
        name: 'Extreme RSI Thresholds',
        passed: false,
        message: 'RSI entry thresholds are extreme, may miss valid signals',
        severity: 'MEDIUM',
      });
    }

    // Check for dangerous pyramiding (v2 parameters)
    if (config.strategyConfig && config.strategyConfig.maxLots > 15) {
      checks.push({
        name: 'Excessive Pyramiding',
        passed: false,
        message: 'Max lots is very high, may lead to significant losses',
        severity: 'CRITICAL',
      });
    }

    return checks;
  }

  /**
   * Check risk safety
   */
  private checkRiskSafety(config: BacktestConfig): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    // Check for no risk limits (v2 parameters)
    if (config.strategyConfig && config.strategyConfig.maxLossPct === 0) {
      checks.push({
        name: 'No Risk Limits',
        passed: false,
        message: 'No maximum loss percentage set - unlimited risk',
        severity: 'CRITICAL',
      });
    }

    // Check for insufficient balance
    if (config.strategyConfig && config.strategyConfig.capital < 10000) {
      checks.push({
        name: 'Low Initial Balance',
        passed: false,
        message: 'Initial balance is too low for meaningful backtesting',
        severity: 'MEDIUM',
      });
    }

    // Check for excessive balance (potential data entry error)
    if (config.strategyConfig && config.strategyConfig.capital > 100000000) {
      // 10 crores
      checks.push({
        name: 'Excessive Initial Balance',
        passed: false,
        message: 'Initial balance is extremely high - verify this is correct',
        severity: 'HIGH',
      });
    }

    return checks;
  }

  /**
   * Check data safety
   */
  private checkDataSafety(config: BacktestConfig): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    // Convert string dates to Date objects if needed
    const startDate =
      typeof config.startDate === 'string'
        ? new Date(config.startDate)
        : config.startDate;
    const endDate =
      typeof config.endDate === 'string'
        ? new Date(config.endDate)
        : config.endDate;

    // Check for very short date range
    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) {
      let severity: SafetyCheck['severity'] = 'MEDIUM';
      let message =
        'Date range is less than 30 days - results may not be reliable';
      let passed = true;

      if (daysDiff < 1) {
        severity = 'HIGH';
        passed = false;
        message = 'Date range is less than 1 day - insufficient data for backtesting';
      } else if (daysDiff < 3) {
        severity = 'MEDIUM';
        passed = true;
        message = 'Date range is very short - results may not be reliable';
      } else {
        severity = 'LOW';
        passed = true;
        message = 'Date range is shorter than recommended (30 days) but sufficient for debugging';
      }

      checks.push({
        name: 'Short Date Range',
        passed,
        message,
        severity,
      });
    }

    // Check for future dates
    const now = new Date();
    if (startDate > now || endDate > now) {
      checks.push({
        name: 'Future Dates',
        passed: false,
        message: 'Cannot backtest with future dates',
        severity: 'CRITICAL',
      });
    }

    // Check for very old dates
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (startDate < oneYearAgo) {
      checks.push({
        name: 'Old Data',
        passed: false,
        message:
          'Data is more than 1 year old - market conditions may have changed',
        severity: 'MEDIUM',
      });
    }

    return checks;
  }

  /**
   * Check computational safety
   */
  private checkComputationalSafety(config: BacktestConfig): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    // Convert string dates to Date objects if needed
    const startDate =
      typeof config.startDate === 'string'
        ? new Date(config.startDate)
        : config.startDate;
    const endDate =
      typeof config.endDate === 'string'
        ? new Date(config.endDate)
        : config.endDate;

    // Check for excessive date range
    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365 * 3) {
      // 3 years
      checks.push({
        name: 'Long Date Range',
        passed: false,
        message: 'Date range is very long - may take excessive time to process',
        severity: 'LOW',
      });
    }

    // Check for high-frequency data
    if (config.timeframe === '1m' && daysDiff > 30) {
      checks.push({
        name: 'High Frequency Long Range',
        passed: false,
        message:
          '1-minute data over long period may be computationally expensive',
        severity: 'MEDIUM',
      });
    }

    return checks;
  }

  /**
   * Generate safety recommendations
   */
  private generateRecommendations(checks: SafetyCheck[]): string[] {
    const recommendations: string[] = [];

    const criticalChecks = checks.filter((c) => c.severity === 'CRITICAL');
    const highChecks = checks.filter((c) => c.severity === 'HIGH');

    if (criticalChecks.length > 0) {
      recommendations.push(
        '🚨 CRITICAL: Fix all critical issues before running backtest',
      );
    }

    if (highChecks.length > 0) {
      recommendations.push(
        '⚠️ HIGH: Address high-severity issues for safer backtesting',
      );
    }

    // Specific recommendations
    if (checks.some((c) => c.name === 'No Risk Limits')) {
      recommendations.push('Set a reasonable maxLossPerLot to limit risk');
    }

    if (checks.some((c) => c.name === 'Excessive Pyramiding')) {
      recommendations.push('Reduce maxLots to a safer level (≤10)');
    }

    if (checks.some((c) => c.name === 'No Gap Filtering')) {
      recommendations.push('Enable gap filtering to reduce false signals');
    }

    if (checks.some((c) => c.name === 'Short Date Range')) {
      recommendations.push('Use at least 30 days of data for reliable results');
    }

    return recommendations;
  }

  /**
   * Check if backtest can proceed safely
   */
  canProceedSafely(safetyReport: SafetyReport): boolean {
    return (
      !safetyReport.checks.some((c) => c.severity === 'CRITICAL') &&
      !safetyReport.checks.some((c) => c.severity === 'HIGH' && !c.passed)
    );
  }

  /**
   * Get safety summary
   */
  getSafetySummary(safetyReport: SafetyReport): string {
    const criticalCount = safetyReport.checks.filter(
      (c) => c.severity === 'CRITICAL',
    ).length;
    const highCount = safetyReport.checks.filter(
      (c) => c.severity === 'HIGH',
    ).length;
    const mediumCount = safetyReport.checks.filter(
      (c) => c.severity === 'MEDIUM',
    ).length;

    if (criticalCount > 0) {
      return `🚨 ${criticalCount} critical issues - BACKTEST BLOCKED`;
    } else if (highCount > 0) {
      return `⚠️ ${highCount} high-severity issues - proceed with caution`;
    } else if (mediumCount > 0) {
      return `ℹ️ ${mediumCount} medium-severity issues - review recommended`;
    } else {
      return `✅ All safety checks passed`;
    }
  }
}
