# Multi-Symbol Strategy Framework Analysis

## Your Question: Multi-Symbol, Multi-Parameter Strategy Framework

You're asking about a sophisticated scenario where:

1. **Same underlying strategy** (e.g., EMA crossover, Supertrend, etc.)
2. **Different data providers/symbols** (NIFTY, BANKNIFTY, etc.)
3. **Different trading rules** for each symbol (different parameters, risk management, etc.)

**Example:**
- **NIFTY**: EMA(9,21), RSI(50,70), Max Lots: 15, Risk: 5%
- **BANKNIFTY**: EMA(5,13), RSI(40,80), Max Lots: 10, Risk: 3%
- **Same Strategy Logic**: But different parameters per symbol

## Current Framework Analysis ✅

### **✅ What's Already Working:**

**1. Symbol-Aware Data Provider**
```typescript
// Data provider already handles different symbols
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<QuoteData | null>;
  getHistoricalCandles(symbol: string, timeframe: string, startDate: Date, endDate: Date): Promise<CandleData[]>;
}

// Usage:
const niftyData = await dataProvider.getHistoricalCandles('NIFTY', '15m', start, end);
const bankniftyData = await dataProvider.getHistoricalCandles('BANKNIFTY', '15m', start, end);
```

**2. Strategy Entity with Symbol Configuration**
```typescript
@Entity('trading_strategies')
export class Strategy {
  @Column({ length: 50 })
  underlyingSymbol: string;  // NIFTY, BANKNIFTY, etc.
  
  @Column({ type: 'jsonb' })
  config: Record<string, any>;  // Symbol-specific config
  
  @Column({ type: 'jsonb' })
  riskManagement: Record<string, any>;  // Symbol-specific risk
}
```

**3. Strategy Runner with Symbol Context**
```typescript
export class StrategyRunnerService {
  async startStrategy(config: StrategyConfig): Promise<boolean> {
    // Each strategy instance has its own symbol and config
    const executionContext: StrategyExecutionContext = {
      strategyId: config.id,
      config,  // Symbol-specific configuration
      currentPosition: existingState?.currentPosition,
      // ...
    };
  }
}
```

### **❌ What's Missing:**

**1. No Symbol-Specific Strategy Configuration**
- Current strategies don't differentiate between symbols
- No symbol-specific parameter loading
- No symbol-specific risk management

**2. No Multi-Symbol Strategy Orchestration**
- No way to run same strategy on multiple symbols
- No symbol-specific parameter management
- No cross-symbol risk management

## Recommended Multi-Symbol Strategy Framework 🎯

### **1. Symbol-Specific Strategy Configuration**

```typescript
// src/modules/strategy/interfaces/multi-symbol-strategy.interface.ts
export interface MultiSymbolStrategyConfig {
  strategyName: string;  // 'advanced-atr', 'ema-crossover', etc.
  symbols: SymbolConfig[];
  globalConfig: GlobalStrategyConfig;
}

export interface SymbolConfig {
  symbol: string;  // 'NIFTY', 'BANKNIFTY', etc.
  timeframe: string;
  strategyConfig: Record<string, any>;  // Symbol-specific parameters
  riskManagement: SymbolRiskManagement;
  dataProvider?: string;  // Optional: different data providers per symbol
}

export interface SymbolRiskManagement {
  maxLots: number;
  maxLossPct: number;
  positionSizingMode: 'CONSERVATIVE' | 'AGGRESSIVE' | 'CUSTOM';
  stopLossPct?: number;
  takeProfitPct?: number;
  maxDrawdownPct?: number;
}

export interface GlobalStrategyConfig {
  // Global settings that apply to all symbols
  maxConcurrentPositions: number;
  maxTotalRisk: number;
  correlationLimit?: number;  // Prevent correlated positions
}
```

### **2. Multi-Symbol Strategy Factory**

```typescript
// src/modules/strategy/factories/multi-symbol-strategy-factory.service.ts
@Injectable()
export class MultiSymbolStrategyFactory {
  constructor(
    private readonly strategyFactory: StrategyFactory,
    private readonly dataProviderFactory: DataProviderFactory,
    private readonly orderExecutionFactory: OrderExecutionFactory,
  ) {}
  
  /**
   * Create strategy instances for multiple symbols
   */
  async createMultiSymbolStrategy(
    config: MultiSymbolStrategyConfig
  ): Promise<MultiSymbolStrategyInstance[]> {
    const instances: MultiSymbolStrategyInstance[] = [];
    
    for (const symbolConfig of config.symbols) {
      // Get strategy implementation
      const strategy = this.strategyFactory.getStrategy(config.strategyName);
      
      // Get data provider for symbol
      const dataProvider = this.dataProviderFactory.createDataProvider(
        symbolConfig.dataProvider || 'CSV'
      );
      
      // Get order execution for symbol
      const orderExecution = this.orderExecutionFactory.createOrderExecutionProvider(
        'MOCK'  // or symbol-specific execution
      );
      
      // Create symbol-specific strategy instance
      const instance = new MultiSymbolStrategyInstance({
        symbol: symbolConfig.symbol,
        strategy,
        dataProvider,
        orderExecution,
        config: symbolConfig.strategyConfig,
        riskManagement: symbolConfig.riskManagement,
        globalConfig: config.globalConfig,
      });
      
      instances.push(instance);
    }
    
    return instances;
  }
}
```

### **3. Symbol-Specific Strategy Instance**

```typescript
// src/modules/strategy/instances/multi-symbol-strategy-instance.ts
export class MultiSymbolStrategyInstance {
  constructor(
    private readonly symbol: string,
    private readonly strategy: IStrategy,
    private readonly dataProvider: MarketDataProvider,
    private readonly orderExecution: OrderExecutionProvider,
    private readonly config: Record<string, any>,
    private readonly riskManagement: SymbolRiskManagement,
    private readonly globalConfig: GlobalStrategyConfig,
  ) {}
  
  /**
   * Evaluate strategy for this specific symbol
   */
  async evaluate(candles: CandleData[], context?: StrategyContext): Promise<StrategyEvaluation> {
    // Apply symbol-specific configuration
    const symbolConfig = {
      ...this.config,
      symbol: this.symbol,
      riskManagement: this.riskManagement,
    };
    
    // Evaluate strategy with symbol-specific config
    return await this.strategy.evaluate(symbolConfig, candles, context);
  }
  
  /**
   * Get symbol-specific data
   */
  async getMarketData(startDate: Date, endDate: Date): Promise<CandleData[]> {
    return await this.dataProvider.getHistoricalCandles(
      this.symbol,
      this.config.timeframe || '15m',
      startDate,
      endDate
    );
  }
  
  /**
   * Execute symbol-specific order
   */
  async executeOrder(order: OrderRequest): Promise<OrderResult> {
    // Apply symbol-specific risk management
    const riskAdjustedOrder = this.applyRiskManagement(order);
    return await this.orderExecution.placeBuyOrder(riskAdjustedOrder);
  }
  
  private applyRiskManagement(order: OrderRequest): OrderRequest {
    // Apply symbol-specific risk management
    const maxQuantity = this.calculateMaxQuantity(order.price);
    const adjustedQuantity = Math.min(order.quantity, maxQuantity);
    
    return {
      ...order,
      quantity: adjustedQuantity,
    };
  }
  
  private calculateMaxQuantity(price: number): number {
    const maxRiskAmount = this.riskManagement.maxLossPct * 100000; // Assuming 100k capital
    const maxQuantity = Math.floor(maxRiskAmount / price);
    return Math.min(maxQuantity, this.riskManagement.maxLots);
  }
}
```

### **4. Multi-Symbol Strategy Orchestrator**

```typescript
// src/modules/strategy/orchestrators/multi-symbol-strategy-orchestrator.service.ts
@Injectable()
export class MultiSymbolStrategyOrchestrator {
  constructor(
    private readonly multiSymbolStrategyFactory: MultiSymbolStrategyFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Run strategy on multiple symbols
   */
  async runMultiSymbolStrategy(
    config: MultiSymbolStrategyConfig,
    startDate: Date,
    endDate: Date
  ): Promise<MultiSymbolStrategyResults> {
    // Create strategy instances for all symbols
    const instances = await this.multiSymbolStrategyFactory.createMultiSymbolStrategy(config);
    
    const results: MultiSymbolStrategyResults = {
      symbolResults: new Map(),
      globalMetrics: {},
      crossSymbolAnalysis: {},
    };
    
    // Run strategy on each symbol
    for (const instance of instances) {
      try {
        // Get symbol-specific data
        const candles = await instance.getMarketData(startDate, endDate);
        
        // Run backtest for this symbol
        const symbolResult = await this.runSymbolBacktest(instance, candles);
        
        results.symbolResults.set(instance.symbol, symbolResult);
        
        // Emit symbol-specific events
        this.eventEmitter.emit('strategy.symbolCompleted', {
          symbol: instance.symbol,
          result: symbolResult,
        });
        
      } catch (error) {
        this.logger.error(`Failed to run strategy for ${instance.symbol}:`, error);
        results.symbolResults.set(instance.symbol, { error: error.message });
      }
    }
    
    // Calculate global metrics
    results.globalMetrics = this.calculateGlobalMetrics(results.symbolResults);
    
    // Calculate cross-symbol analysis
    results.crossSymbolAnalysis = this.calculateCrossSymbolAnalysis(results.symbolResults);
    
    return results;
  }
  
  private async runSymbolBacktest(
    instance: MultiSymbolStrategyInstance,
    candles: CandleData[]
  ): Promise<SymbolStrategyResult> {
    // Run strategy evaluation for each candle
    const trades: Trade[] = [];
    let currentBalance = 100000; // Starting balance
    
    for (let i = 0; i < candles.length; i++) {
      const currentCandles = candles.slice(0, i + 1);
      const evaluation = await instance.evaluate(currentCandles);
      
      // Process signals
      for (const signal of evaluation.signals) {
        if (signal.type === 'ENTRY') {
          // Execute entry order
          const orderResult = await instance.executeOrder({
            symbol: instance.symbol,
            quantity: signal.data.quantity,
            price: signal.data.price,
            orderType: 'MARKET',
            product: 'MIS',
            validity: 'DAY',
          });
          
          if (orderResult.success) {
            // Record trade
            trades.push({
              symbol: instance.symbol,
              entryTime: new Date(candles[i].timestamp),
              entryPrice: signal.data.price,
              quantity: signal.data.quantity,
              direction: signal.data.direction,
            });
          }
        }
        // Handle exit signals...
      }
    }
    
    return {
      symbol: instance.symbol,
      trades,
      totalReturn: this.calculateTotalReturn(trades),
      winRate: this.calculateWinRate(trades),
      maxDrawdown: this.calculateMaxDrawdown(trades),
    };
  }
}
```

## Configuration Examples 📋

### **Example 1: NIFTY vs BANKNIFTY with Different Parameters**

```typescript
const multiSymbolConfig: MultiSymbolStrategyConfig = {
  strategyName: 'advanced-atr',
  symbols: [
    {
      symbol: 'NIFTY',
      timeframe: '15m',
      strategyConfig: {
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 65,
        rsiExitShort: 35,
        atrDeclineThreshold: 0.08,
        pyramidingEnabled: true,
        exitMode: 'LIFO',
      },
      riskManagement: {
        maxLots: 15,
        maxLossPct: 0.05,
        positionSizingMode: 'CONSERVATIVE',
        stopLossPct: 0.02,
        takeProfitPct: 0.03,
      }
    },
    {
      symbol: 'BANKNIFTY',
      timeframe: '15m',
      strategyConfig: {
        emaFastPeriod: 5,
        emaSlowPeriod: 13,
        rsiEntryLong: 40,
        rsiEntryShort: 60,
        rsiExitLong: 80,
        rsiExitShort: 20,
        atrDeclineThreshold: 0.06,
        pyramidingEnabled: false,
        exitMode: 'FIFO',
      },
      riskManagement: {
        maxLots: 10,
        maxLossPct: 0.03,
        positionSizingMode: 'AGGRESSIVE',
        stopLossPct: 0.015,
        takeProfitPct: 0.025,
      }
    }
  ],
  globalConfig: {
    maxConcurrentPositions: 2,
    maxTotalRisk: 0.08,
    correlationLimit: 0.7,
  }
};
```

### **Example 2: Same Strategy, Different Data Providers**

```typescript
const multiProviderConfig: MultiSymbolStrategyConfig = {
  strategyName: 'ema-crossover',
  symbols: [
    {
      symbol: 'NIFTY',
      timeframe: '15m',
      dataProvider: 'CSV',  // Use CSV data
      strategyConfig: {
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        rsiPeriod: 14,
      },
      riskManagement: {
        maxLots: 20,
        maxLossPct: 0.04,
      }
    },
    {
      symbol: 'BANKNIFTY',
      timeframe: '15m',
      dataProvider: 'GROWW',  // Use live data
      strategyConfig: {
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        rsiPeriod: 14,
      },
      riskManagement: {
        maxLots: 15,
        maxLossPct: 0.03,
      }
    }
  ],
  globalConfig: {
    maxConcurrentPositions: 2,
    maxTotalRisk: 0.07,
  }
};
```

## Benefits of This Framework 🚀

### **1. Maximum Reusability**
- ✅ **Same Strategy Logic**: Reuse strategy implementation across symbols
- ✅ **Symbol-Specific Parameters**: Different configs per symbol
- ✅ **Symbol-Specific Risk Management**: Different risk profiles per symbol
- ✅ **Symbol-Specific Data Providers**: Different data sources per symbol

### **2. Configuration-Driven**
- ✅ **Everything Configurable**: All parameters via configuration
- ✅ **Easy Symbol Addition**: Add new symbols without code changes
- ✅ **Easy Parameter Tuning**: Tune parameters per symbol independently
- ✅ **Easy Risk Management**: Different risk profiles per symbol

### **3. SOLID Principles**
- ✅ **Single Responsibility**: Each component has one job
- ✅ **Open/Closed**: Easy to extend without modification
- ✅ **Liskov Substitution**: All implementations are interchangeable
- ✅ **Interface Segregation**: Clean, focused interfaces
- ✅ **Dependency Inversion**: Depends on abstractions, not concretions

### **4. Real-World Use Cases**
- ✅ **NIFTY vs BANKNIFTY**: Different volatility, different parameters
- ✅ **Different Timeframes**: 15m for NIFTY, 5m for BANKNIFTY
- ✅ **Different Risk Profiles**: Conservative for NIFTY, Aggressive for BANKNIFTY
- ✅ **Different Data Sources**: CSV for backtesting, Live for trading
- ✅ **Cross-Symbol Analysis**: Correlation, diversification, etc.

## Implementation Plan 📋

### **Phase 1: Core Interfaces (2 days)**
1. Create `MultiSymbolStrategyConfig` interface
2. Create `SymbolConfig` interface
3. Create `MultiSymbolStrategyInstance` class
4. Create `MultiSymbolStrategyOrchestrator` service

### **Phase 2: Factory Implementation (2 days)**
1. Create `MultiSymbolStrategyFactory`
2. Update existing `StrategyFactory` to support multi-symbol
3. Create symbol-specific strategy instances
4. Test with existing strategies

### **Phase 3: Orchestrator Implementation (2 days)**
1. Create `MultiSymbolStrategyOrchestrator`
2. Implement cross-symbol risk management
3. Implement cross-symbol analysis
4. Test with multiple symbols

### **Phase 4: Integration & Testing (1 day)**
1. Integrate with existing backtest system
2. Create configuration examples
3. Test with NIFTY vs BANKNIFTY
4. Document usage

## Conclusion 🎯

### **Current Framework: 6/10 for Multi-Symbol**
- ✅ **Symbol-Aware Data Provider**: Already supports different symbols
- ✅ **Strategy Entity**: Already has symbol field
- ❌ **No Symbol-Specific Parameters**: No way to configure per symbol
- ❌ **No Multi-Symbol Orchestration**: No way to run same strategy on multiple symbols

### **With Recommended Framework: 10/10 for Multi-Symbol**
- ✅ **Perfect Multi-Symbol Support**: Same strategy, different parameters per symbol
- ✅ **Configuration-Driven**: Everything configurable via config
- ✅ **Symbol-Specific Risk Management**: Different risk profiles per symbol
- ✅ **Cross-Symbol Analysis**: Correlation, diversification, etc.
- ✅ **Easy Symbol Addition**: Add new symbols without code changes

### **Key Benefits:**
1. **Same Strategy Logic**: Reuse strategy implementation across symbols
2. **Symbol-Specific Parameters**: Different configs per symbol (NIFTY vs BANKNIFTY)
3. **Symbol-Specific Risk Management**: Different risk profiles per symbol
4. **Symbol-Specific Data Providers**: Different data sources per symbol
5. **Cross-Symbol Analysis**: Correlation, diversification, portfolio-level metrics

This framework will make it **trivial to run the same strategy on multiple symbols with different parameters**, which is exactly what you need for NIFTY vs BANKNIFTY trading with different rules but the same underlying strategy logic.


