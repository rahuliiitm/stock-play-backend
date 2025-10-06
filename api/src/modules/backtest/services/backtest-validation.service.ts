import { Injectable, Logger } from '@nestjs/common';
import { EmaGapAtrConfig } from '../../strategy/services/ema-gap-atr-strategy.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BacktestConfig {
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  strategyConfig: EmaGapAtrConfig;
}

/**
 * Backtest Validation Service
 *
 * This service validates backtest configurations to prevent dangerous settings
 * that could lead to financial losses. It follows strict validation rules
 * and provides clear error messages for configuration issues.
 */
@Injectable()
export class BacktestValidationService {
  private readonly logger = new Logger(BacktestValidationService.name);

  /**
   * Validate backtest configuration
   */
  validateBacktestConfig(config: BacktestConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push('Configuration is required');
      return { isValid: false, errors, warnings };
    }

    // Validate basic configuration
    this.validateBasicConfig(config, errors, warnings);

    // Validate strategy configuration (v2)
    if (config.strategyConfig) {
      this.validateStrategyConfigV2(config.strategyConfig, errors, warnings);
    }

    // Validate date range
    this.validateDateRange(config, errors, warnings);

    // Validate balance
    this.validateBalance(config.initialBalance, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate basic configuration parameters
   */
  private validateBasicConfig(
    config: BacktestConfig,
    errors: string[],
    warnings: string[],
  ): void {
    if (!config.symbol || config.symbol.trim() === '') {
      errors.push('Symbol is required');
    }

    if (
      !config.timeframe ||
      !['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'].includes(config.timeframe)
    ) {
      errors.push(
        'Invalid timeframe. Must be one of: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w',
      );
    }

    if (!config.startDate || !config.endDate) {
      errors.push('Start date and end date are required');
    }

    // Convert string dates to Date objects if needed
    const startDate =
      typeof config.startDate === 'string'
        ? new Date(config.startDate)
        : config.startDate;
    const endDate =
      typeof config.endDate === 'string'
        ? new Date(config.endDate)
        : config.endDate;

    if (startDate && endDate && startDate >= endDate) {
      errors.push('Start date must be before end date');
    }

    // Check for reasonable date range
    if (startDate && endDate) {
      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 1) {
        errors.push('Date range must be at least 1 day');
      }
      if (daysDiff > 365 * 5) {
        // 5 years
        warnings.push(
          'Date range is very long (>5 years), this may take significant time to process',
        );
      }
    }
  }

  /**
   * Validate strategy configuration (v2)
   */
  validateStrategyConfigV2(
    config: EmaGapAtrConfig,
    errors: string[],
    warnings: string[],
  ): void {
    // EMA periods
    if (config.emaFastPeriod >= config.emaSlowPeriod) {
      errors.push('EMA fast period must be less than slow period');
    }
    if (config.emaFastPeriod <= 0 || config.emaFastPeriod > 200) {
      errors.push('EMA fast period must be between 1 and 200');
    }
    if (config.emaSlowPeriod <= 0 || config.emaSlowPeriod > 200) {
      errors.push('EMA slow period must be between 1 and 200');
    }

    // ATR parameters
    if (config.atrPeriod <= 0 || config.atrPeriod > 100) {
      errors.push('ATR period must be between 1 and 100');
    }
    if (config.atrMultiplierEntry < 0 || config.atrMultiplierEntry > 10) {
      errors.push('ATR entry multiplier must be between 0 and 10');
    }
    if (config.atrMultiplierUnwind < 0 || config.atrMultiplierUnwind > 10) {
      errors.push('ATR unwind multiplier must be between 0 and 10');
    }

    // Strong candle threshold
    if (config.strongCandleThreshold < 0 || config.strongCandleThreshold > 1) {
      errors.push('Strong candle threshold must be between 0 and 1');
    }

    // Gap threshold
    if (config.gapUpDownThreshold < 0 || config.gapUpDownThreshold > 1) {
      errors.push('Gap threshold must be between 0 and 1');
    }

    // RSI parameters
    if (config.rsiPeriod <= 0 || config.rsiPeriod > 100) {
      errors.push('RSI period must be between 1 and 100');
    }
    if (config.rsiEntryLong < 0 || config.rsiEntryLong > 100) {
      errors.push('RSI entry long must be between 0 and 100');
    }
    if (config.rsiEntryShort < 0 || config.rsiEntryShort > 100) {
      errors.push('RSI entry short must be between 0 and 100');
    }
    if (config.rsiExitLong < 0 || config.rsiExitLong > 100) {
      errors.push('RSI exit long must be between 0 and 100');
    }
    if (config.rsiExitShort < 0 || config.rsiExitShort > 100) {
      errors.push('RSI exit short must be between 0 and 100');
    }

    // Capital and risk
    if (config.capital <= 0) {
      errors.push('Capital must be positive');
    }
    if (config.maxLossPct < 0 || config.maxLossPct > 1) {
      errors.push('Max loss percentage must be between 0 and 1');
    }
    if (config.positionSize <= 0) {
      errors.push('Position size must be positive');
    }
    if (config.maxLots < 1 || config.maxLots > 20) {
      errors.push('Max lots must be between 1 and 20');
    }
  }

  /**
   * Validate date range
   */
  private validateDateRange(
    config: BacktestConfig,
    errors: string[],
    warnings: string[],
  ): void {
    if (!config.startDate || !config.endDate) return;

    // Convert string dates to Date objects if needed
    const startDate =
      typeof config.startDate === 'string'
        ? new Date(config.startDate)
        : config.startDate;
    const endDate =
      typeof config.endDate === 'string'
        ? new Date(config.endDate)
        : config.endDate;

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Check if dates are in the future
    if (startDate > now) {
      errors.push('Start date cannot be in the future');
    }

    if (endDate > now) {
      errors.push('End date cannot be in the future');
    }

    // Check if dates are too old
    if (startDate < oneYearAgo) {
      warnings.push(
        'Start date is more than 1 year ago - data may be outdated',
      );
    }

    // Check for reasonable date range
    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
      warnings.push(
        'Date range is less than 1 week - results may not be statistically significant',
      );
    }
  }

  /**
   * Validate initial balance
   */
  private validateBalance(
    initialBalance: number,
    errors: string[],
    warnings: string[],
  ): void {
    if (initialBalance <= 0) {
      errors.push('Initial balance must be positive');
    }

    if (initialBalance < 10000) {
      warnings.push(
        'Initial balance is less than ₹10,000 - results may not be representative',
      );
    }

    if (initialBalance > 10000000) {
      // 1 crore
      warnings.push(
        'Initial balance is very high - ensure this is intentional',
      );
    }
  }

  /**
   * Validate CSV data availability
   */
  async validateDataAvailability(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // This would check if CSV files exist for the given symbol and timeframe
    // Implementation would depend on the file system structure

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: ValidationResult): string {
    if (result.isValid) {
      return `✅ Configuration is valid${result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : ''}`;
    } else {
      return `❌ Configuration has ${result.errors.length} errors${result.warnings.length > 0 ? ` and ${result.warnings.length} warnings` : ''}`;
    }
  }
}
