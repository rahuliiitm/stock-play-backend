import { Injectable, Logger } from '@nestjs/common';
import { StrategyFactory } from './strategy-factory.service';
import { 
  MultiSymbolStrategyConfig, 
  SymbolConfig
} from '../interfaces/multi-symbol-strategy.interface';
import { MultiSymbolStrategyInstance } from '../instances/multi-symbol-strategy-instance';
import { IStrategy } from '../interfaces/strategy.interface';
import { MarketDataProvider } from '../../trading/interfaces/data-provider.interface';
import { OrderExecutionProvider } from '../../trading/interfaces/order-execution.interface';

/**
 * Multi-Symbol Strategy Factory Service
 * 
 * Factory for creating strategy instances across multiple symbols
 * with symbol-specific configurations and risk management.
 */
@Injectable()
export class MultiSymbolStrategyFactory {
  private readonly logger = new Logger(MultiSymbolStrategyFactory.name);
  
  constructor(
    private readonly strategyFactory?: StrategyFactory,
  ) {
    // Initialize strategy factory if not provided (for standalone execution)
    if (!this.strategyFactory) {
      // Create a minimal strategy factory for standalone execution
      this.strategyFactory = {
        listStrategies: () => ['advanced-atr', 'ema-gap-atr', 'nifty-options'],
        hasStrategy: (name: string) => ['advanced-atr', 'ema-gap-atr', 'nifty-options'].includes(name),
        getStrategy: (name: string) => {
          if (name === 'advanced-atr') {
            return {
              name: 'advanced-atr',
              version: '1.0.0',
              description: 'Advanced ATR Strategy with Supertrend and pyramiding',
              evaluate: async () => ({ signals: [], diagnostics: {} }),
              validateConfig: () => ({ isValid: true, errors: [], warnings: [] }),
              getDefaultConfig: () => ({ id: 'default', name: 'Advanced ATR', symbol: 'NIFTY', timeframe: '15m' }),
            };
          }
          throw new Error(`Strategy '${name}' not found`);
        },
        getStrategyInfo: (name: string) => ({
          name,
          version: '1.0.0',
          description: `${name} strategy`,
        }),
      } as any;
    }
  }
  
  /**
   * Create strategy instances for multiple symbols
   * @param config - Multi-symbol strategy configuration
   * @returns Array of symbol-specific strategy instances
   */
  async createMultiSymbolStrategy(
    config: MultiSymbolStrategyConfig
  ): Promise<MultiSymbolStrategyInstance[]> {
    this.logger.debug(`Creating multi-symbol strategy: ${config.strategyName}`);
    this.logger.debug(`Symbols: ${config.symbols.map(s => s.symbol).join(', ')}`);
    
    const instances: MultiSymbolStrategyInstance[] = [];
    
    for (const symbolConfig of config.symbols) {
      try {
        // Get strategy implementation
        const strategy = this.strategyFactory?.getStrategy(config.strategyName);
        if (!strategy) {
          throw new Error(`Strategy '${config.strategyName}' not found`);
        }
        
        // Create symbol-specific strategy instance
        const instance = new MultiSymbolStrategyInstance(
          symbolConfig.symbol,
          strategy,
          symbolConfig.strategyConfig,
          symbolConfig.riskManagement,
          config.globalConfig,
          symbolConfig.dataProvider,
          symbolConfig.orderExecution
        );
        
        instances.push(instance);
        
        this.logger.debug(`Created strategy instance for ${symbolConfig.symbol}`);
      } catch (error) {
        this.logger.error(`Failed to create strategy instance for ${symbolConfig.symbol}:`, error);
        throw new Error(`Failed to create strategy instance for ${symbolConfig.symbol}: ${error.message}`);
      }
    }
    
    this.logger.log(`Created ${instances.length} strategy instances`);
    return instances;
  }
  
  /**
   * Validate multi-symbol strategy configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateMultiSymbolConfig(config: MultiSymbolStrategyConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate strategy name
    if (!config.strategyName) {
      errors.push('Strategy name is required');
    } else if (!this.strategyFactory?.hasStrategy(config.strategyName)) {
      const availableStrategies = this.strategyFactory?.listStrategies() || ['advanced-atr', 'ema-gap-atr', 'nifty-options'];
      errors.push(`Strategy '${config.strategyName}' not found. Available: ${availableStrategies.join(', ')}`);
    }
    
    // Validate symbols
    if (!config.symbols || config.symbols.length === 0) {
      errors.push('At least one symbol is required');
    } else {
      const symbols = new Set<string>();
      for (const symbolConfig of config.symbols) {
        if (!symbolConfig.symbol) {
          errors.push('Symbol name is required for each symbol configuration');
        } else if (symbols.has(symbolConfig.symbol)) {
          errors.push(`Duplicate symbol: ${symbolConfig.symbol}`);
        } else {
          symbols.add(symbolConfig.symbol);
        }
        
        if (!symbolConfig.timeframe) {
          errors.push(`Timeframe is required for ${symbolConfig.symbol}`);
        }
        
        if (!symbolConfig.strategyConfig) {
          errors.push(`Strategy configuration is required for ${symbolConfig.symbol}`);
        }
        
        if (!symbolConfig.riskManagement) {
          errors.push(`Risk management is required for ${symbolConfig.symbol}`);
        }
      }
    }
    
    // Validate global configuration
    if (!config.globalConfig) {
      errors.push('Global configuration is required');
    } else {
      if (!config.globalConfig.maxConcurrentPositions || config.globalConfig.maxConcurrentPositions <= 0) {
        errors.push('Max concurrent positions must be greater than 0');
      }
      
      if (!config.globalConfig.maxTotalRisk || config.globalConfig.maxTotalRisk <= 0 || config.globalConfig.maxTotalRisk > 1) {
        errors.push('Max total risk must be between 0 and 1');
      }
      
      if (config.globalConfig.correlationLimit && (config.globalConfig.correlationLimit < 0 || config.globalConfig.correlationLimit > 1)) {
        errors.push('Correlation limit must be between 0 and 1');
      }
    }
    
    // Validate symbol-specific configurations
    if (config.strategyName && this.strategyFactory?.hasStrategy(config.strategyName)) {
      try {
        const strategy = this.strategyFactory.getStrategy(config.strategyName);
        
        for (const symbolConfig of config.symbols) {
          if (symbolConfig.strategyConfig) {
            const validation = strategy.validateConfig(symbolConfig.strategyConfig);
            if (!validation.isValid) {
              errors.push(`${symbolConfig.symbol}: ${validation.errors.join(', ')}`);
            }
            warnings.push(...validation.warnings.map(w => `${symbolConfig.symbol}: ${w}`));
          }
        }
      } catch (error) {
        warnings.push(`Could not validate strategy configurations: ${error.message}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Get available strategies
   * @returns Array of available strategy names
   */
  getAvailableStrategies(): string[] {
    try {
      return this.strategyFactory?.listStrategies() || ['advanced-atr', 'ema-gap-atr', 'nifty-options'];
    } catch (error) {
      this.logger.warn('Could not get available strategies:', error.message);
      return ['advanced-atr', 'ema-gap-atr', 'nifty-options'];
    }
  }
  
  /**
   * Get strategy information
   * @param strategyName - Strategy name
   * @returns Strategy information
   */
  getStrategyInfo(strategyName: string): { name: string; version: string; description: string } {
    try {
      return this.strategyFactory?.getStrategyInfo(strategyName) || {
        name: strategyName,
        version: '1.0.0',
        description: `${strategyName} strategy`,
      };
    } catch (error) {
      this.logger.warn(`Could not get strategy info for ${strategyName}:`, error.message);
      return {
        name: strategyName,
        version: '1.0.0',
        description: `${strategyName} strategy`,
      };
    }
  }
}
