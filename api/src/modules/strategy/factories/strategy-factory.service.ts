import { Injectable, Logger } from '@nestjs/common';
import { IStrategy, StrategyConfig, ValidationResult } from '../interfaces/strategy.interface';
import { EmaGapAtrStrategyService } from '../services/ema-gap-atr-strategy.service';
import { AdvancedATRStrategyService } from '../services/advanced-atr-strategy.service';
import { PriceActionStrategyService } from '../services/price-action-strategy.service';
import { NiftyOptionSellingService } from '../services/nifty-option-selling.service';

/**
 * Strategy Factory Service
 * 
 * Factory pattern implementation for creating and managing strategy instances.
 * Enables configuration-driven strategy selection and maximum reusability.
 */
@Injectable()
export class StrategyFactory {
  private readonly logger = new Logger(StrategyFactory.name);
  private strategies = new Map<string, IStrategy>();
  
  constructor(
    private readonly emaGapAtrStrategy: EmaGapAtrStrategyService,
    private readonly priceActionStrategy: PriceActionStrategyService,
  ) {
    this.registerStrategies();
  }
  
  /**
   * Register all available strategies
   */
  private registerStrategies(): void {
    this.logger.debug('Registering available strategies...');
    
    // Register EMA Gap ATR Strategy with adapter
    this.register('ema-gap-atr', this.createEmaGapAtrAdapter());
    
    // Register Price Action Strategy with adapter
    this.register('price-action', this.createPriceActionAdapter());
    
    this.logger.log(`Registered ${this.strategies.size} strategies: ${Array.from(this.strategies.keys()).join(', ')}`);
  }
  
  /**
   * Register a strategy with the factory
   * @param name - Strategy name
   * @param strategy - Strategy implementation
   */
  register(name: string, strategy: IStrategy): void {
    this.strategies.set(name, strategy);
    this.logger.debug(`Registered strategy: ${name}`);
  }
  
  /**
   * Get a strategy by name
   * @param name - Strategy name
   * @returns Strategy implementation
   */
  getStrategy(name: string): IStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy '${name}' not found. Available strategies: ${Array.from(this.strategies.keys()).join(', ')}`);
    }
    return strategy;
  }
  
  /**
   * Get all available strategy names
   * @returns Array of strategy names
   */
  listStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
  
  /**
   * Check if a strategy exists
   * @param name - Strategy name
   * @returns True if strategy exists
   */
  hasStrategy(name: string): boolean {
    return this.strategies.has(name);
  }
  
  /**
   * Get strategy information
   * @param name - Strategy name
   * @returns Strategy information
   */
  getStrategyInfo(name: string): { name: string; version: string; description: string } {
    const strategy = this.getStrategy(name);
    return {
      name: strategy.name,
      version: strategy.version,
      description: strategy.description,
    };
  }
  
  /**
   * Create EMA Gap ATR Strategy adapter
   */
  private createEmaGapAtrAdapter(): IStrategy {
    return {
      name: 'ema-gap-atr',
      version: '1.0.0',
      description: 'EMA Gap ATR Strategy with RSI filtering',
      
      async evaluate(config: StrategyConfig, candles: any[], context?: any): Promise<any> {
        return this.emaGapAtrStrategy.evaluate(config, candles);
      },
      
      validateConfig(config: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!config.symbol) errors.push('Symbol is required');
        if (!config.timeframe) errors.push('Timeframe is required');
        if (!config.emaFastPeriod) errors.push('EMA Fast Period is required');
        if (!config.emaSlowPeriod) errors.push('EMA Slow Period is required');
        if (!config.rsiPeriod) errors.push('RSI Period is required');
        
        if (config.emaFastPeriod >= config.emaSlowPeriod) {
          errors.push('EMA Fast Period must be less than EMA Slow Period');
        }
        
        if (config.rsiEntryLong < 0 || config.rsiEntryLong > 100) {
          errors.push('RSI Entry Long must be between 0 and 100');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
      
      getDefaultConfig(): StrategyConfig {
        return {
          id: 'default-ema-gap-atr',
          name: 'EMA Gap ATR Strategy',
          symbol: 'NIFTY',
          timeframe: '15m',
          emaFastPeriod: 9,
          emaSlowPeriod: 21,
          atrPeriod: 14,
          rsiPeriod: 14,
          rsiEntryLong: 50,
          rsiEntryShort: 50,
          rsiExitLong: 70,
          rsiExitShort: 30,
          capital: 100000,
          maxLossPct: 0.05,
          positionSize: 1,
          maxLots: 10,
          pyramidingEnabled: false,
          exitMode: 'FIFO',
        };
      },
      
      getWarmupPeriod(config: StrategyConfig): number {
        // Calculate warm-up period for EMA Gap ATR Strategy
        const emaWarmup = Math.max(config.emaFastPeriod || 9, config.emaSlowPeriod || 21) + 10;
        const rsiWarmup = (config.rsiPeriod || 14) + 10;
        const atrWarmup = (config.atrPeriod || 14) + 10;
        
        const warmupPeriod = Math.max(emaWarmup, rsiWarmup, atrWarmup);
        this.logger.debug(`EMA Gap ATR warm-up period: ${warmupPeriod} candles`);
        return warmupPeriod;
      },
    };
  }
  
  /**
   * Create Advanced ATR Strategy adapter
   */
  private createAdvancedATRAdapter(): IStrategy {
    return {
      name: 'advanced-atr',
      version: '1.0.0',
      description: 'Advanced ATR Strategy with Supertrend and pyramiding',
      
      async evaluate(config: StrategyConfig, candles: any[], context?: any): Promise<any> {
        return this.advancedATRStrategy.evaluate(config, candles);
      },
      
      validateConfig(config: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!config.symbol) errors.push('Symbol is required');
        if (!config.timeframe) errors.push('Timeframe is required');
        if (!config.emaFastPeriod) errors.push('EMA Fast Period is required');
        if (!config.emaSlowPeriod) errors.push('EMA Slow Period is required');
        if (!config.atrPeriod) errors.push('ATR Period is required');
        
        if (config.emaFastPeriod >= config.emaSlowPeriod) {
          errors.push('EMA Fast Period must be less than EMA Slow Period');
        }
        
        if (config.atrDeclineThreshold && (config.atrDeclineThreshold < 0 || config.atrDeclineThreshold > 1)) {
          errors.push('ATR Decline Threshold must be between 0 and 1');
        }
        
        if (config.atrExpansionThreshold && (config.atrExpansionThreshold < 0 || config.atrExpansionThreshold > 1)) {
          errors.push('ATR Expansion Threshold must be between 0 and 1');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
      
      getDefaultConfig(): StrategyConfig {
        return {
          id: 'default-advanced-atr',
          name: 'Advanced ATR Strategy',
          symbol: 'NIFTY',
          timeframe: '15m',
          emaFastPeriod: 9,
          emaSlowPeriod: 21,
          atrPeriod: 14,
          atrDeclineThreshold: 0.08,
          atrExpansionThreshold: 0.002,
          rsiEntryLong: 50,
          rsiEntryShort: 50,
          rsiExitLong: 65,
          rsiExitShort: 35,
          pyramidingEnabled: true,
          exitMode: 'LIFO',
          trailingStopEnabled: true,
          trailingStopType: 'ATR',
          trailingStopATRMultiplier: 2.0,
          capital: 100000,
          maxLossPct: 0.05,
          positionSize: 1,
          maxLots: 15,
        };
      },
      
      getWarmupPeriod(config: StrategyConfig): number {
        // Calculate warm-up period for Advanced ATR Strategy
        const emaWarmup = Math.max(config.emaFastPeriod || 9, config.emaSlowPeriod || 21) + 10;
        const atrWarmup = (config.atrPeriod || 14) + 10;
        const rsiWarmup = (config.rsiPeriod || 14) + 10;
        const supertrendWarmup = (config.supertrendPeriod || 10) + 10;
        
        const warmupPeriod = Math.max(emaWarmup, atrWarmup, rsiWarmup, supertrendWarmup);
        this.logger.debug(`Advanced ATR warm-up period: ${warmupPeriod} candles`);
        return warmupPeriod;
      },
    };
  }
  
  /**
   * Create Price Action Strategy adapter
   */
  private createPriceActionAdapter(): IStrategy {
    return {
      name: 'price-action',
      version: '1.0.0',
      description: 'Price Action Strategy with Supertrend(10,2) and MACD',
      
      async evaluate(config: StrategyConfig, candles: any[], context?: any): Promise<any> {
        return this.priceActionStrategy.evaluate(config, candles, context);
      },
      
      validateConfig(config: any): ValidationResult {
        return this.priceActionStrategy.validateConfig(config);
      },
      
      getDefaultConfig(): StrategyConfig {
        return this.priceActionStrategy.getDefaultConfig();
      },
      
      getWarmupPeriod(config: StrategyConfig): number {
        return this.priceActionStrategy.getWarmupPeriod(config);
      },
    };
  }

  /**
   * Create Nifty Options Strategy adapter
   */
  private createNiftyOptionAdapter(): IStrategy {
    return {
      name: 'nifty-options',
      version: '1.0.0',
      description: 'Nifty Options Selling Strategy',
      
      async evaluate(config: StrategyConfig, candles: any[], context?: any): Promise<any> {
        // Convert to NiftyOptionStrategy format
        const niftyConfig = {
          underlying: config.symbol,
          timeframe: config.timeframe,
          options: config.options || { enabled: true },
          riskManagement: config.riskManagement || {},
        };
        
        return this.niftyOptionStrategy.evaluateStrategy(niftyConfig, context);
      },
      
      validateConfig(config: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!config.symbol) errors.push('Symbol is required');
        if (!config.timeframe) errors.push('Timeframe is required');
        
        if (config.options && !config.options.enabled) {
          warnings.push('Options trading is disabled');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
      
      getDefaultConfig(): StrategyConfig {
        return {
          id: 'default-nifty-options',
          name: 'Nifty Options Strategy',
          symbol: 'NIFTY',
          timeframe: '15m',
          options: {
            enabled: true,
            strikeSelection: {
              callStrikes: ['ATM'],
              putStrikes: ['ATM'],
            },
            expiry: 'weekly',
          },
          riskManagement: {
            maxLots: 5,
            maxLossPct: 0.03,
            positionSizingMode: 'CONSERVATIVE',
          },
        };
      },
      
      getWarmupPeriod(config: StrategyConfig): number {
        // Calculate warm-up period for Nifty Options Strategy
        // Options strategies typically need less warm-up as they use shorter-term indicators
        const warmupPeriod = 50; // Conservative warm-up for options
        this.logger.debug(`Nifty Options warm-up period: ${warmupPeriod} candles`);
        return warmupPeriod;
      },
    };
  }
}

