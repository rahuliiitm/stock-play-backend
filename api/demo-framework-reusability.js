#!/usr/bin/env node

/**
 * Framework Reusability Demonstration
 * 
 * This script demonstrates how the current strategy and trading framework
 * components can be reused with just configuration values.
 */

console.log('🔧 STRATEGY & TRADING FRAMEWORK REUSABILITY DEMO');
console.log('================================================\n');

// Demo 1: Exit Strategy Factory Reusability
console.log('✅ Demo 1: Exit Strategy Factory - Perfect Reusability');
console.log('------------------------------------------------------');

const exitStrategyConfigs = [
  { mode: 'FIFO', description: 'First In, First Out exit strategy' },
  { mode: 'LIFO', description: 'Last In, First Out exit strategy' }
];

exitStrategyConfigs.forEach(config => {
  console.log(`📊 Exit Strategy: ${config.mode}`);
  console.log(`   Description: ${config.description}`);
  console.log(`   Usage: factory.createExitStrategy('${config.mode}')`);
  console.log(`   ✅ Fully configurable - just pass the mode!`);
  console.log('');
});

// Demo 2: Trailing Stop Factory Reusability
console.log('✅ Demo 2: Trailing Stop Factory - Perfect Reusability');
console.log('------------------------------------------------------');

const trailingStopConfigs = [
  {
    type: 'ATR',
    enabled: true,
    atrMultiplier: 2.0,
    activationProfit: 0.01,
    description: 'ATR-based trailing stop'
  },
  {
    type: 'PERCENTAGE',
    enabled: true,
    percentage: 0.02,
    activationProfit: 0.01,
    description: 'Percentage-based trailing stop'
  },
  {
    type: 'ATR',
    enabled: false,
    description: 'Disabled trailing stop (No-Op)'
  }
];

trailingStopConfigs.forEach(config => {
  console.log(`📊 Trailing Stop: ${config.type}`);
  console.log(`   Enabled: ${config.enabled}`);
  if (config.enabled) {
    console.log(`   Config: ${JSON.stringify(config, null, 2)}`);
  }
  console.log(`   Usage: factory.createTrailingStopComponent(config)`);
  console.log(`   ✅ Fully configurable - just pass the config!`);
  console.log('');
});

// Demo 3: Strategy Building Blocks Reusability
console.log('✅ Demo 3: Strategy Building Blocks - High Reusability');
console.log('-----------------------------------------------------');

const conditionConfigs = [
  {
    type: 'INDICATOR_COMPARISON',
    operator: 'GT',
    leftOperand: 'RSI',
    rightOperand: 50,
    description: 'RSI > 50 condition'
  },
  {
    type: 'PRICE_CONDITION',
    operator: 'GT',
    leftOperand: 'close',
    rightOperand: 'ema_20',
    description: 'Close > EMA 20 condition'
  },
  {
    type: 'VOLUME_CONDITION',
    operator: 'GT',
    leftOperand: 'volume',
    rightOperand: 1000000,
    description: 'Volume > 1M condition'
  },
  {
    type: 'CUSTOM',
    customLogic: 'rsi > 70 && volume > avg_volume * 1.5',
    description: 'Custom RSI and volume condition'
  }
];

conditionConfigs.forEach(config => {
  console.log(`📊 Condition: ${config.type}`);
  console.log(`   Config: ${JSON.stringify(config, null, 2)}`);
  console.log(`   Usage: buildingBlocks.evaluateCondition(condition, context)`);
  console.log(`   ✅ Fully configurable - just pass the condition!`);
  console.log('');
});

// Demo 4: Data Provider Reusability
console.log('✅ Demo 4: Data Provider Interface - Perfect Reusability');
console.log('--------------------------------------------------------');

const dataProviderConfigs = [
  {
    type: 'CSV',
    config: {
      dataDir: '/path/to/data',
      symbol: 'NIFTY',
      timeframe: '15m'
    },
    description: 'CSV file data provider'
  },
  {
    type: 'GROWW',
    config: {
      apiKey: 'your-api-key',
      symbol: 'NIFTY',
      timeframe: '15m'
    },
    description: 'Groww API data provider'
  },
  {
    type: 'MOCK',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      generateData: true
    },
    description: 'Mock data provider for testing'
  }
];

dataProviderConfigs.forEach(config => {
  console.log(`📊 Data Provider: ${config.type}`);
  console.log(`   Config: ${JSON.stringify(config.config, null, 2)}`);
  console.log(`   Usage: provider.getHistoricalCandles(symbol, timeframe, start, end)`);
  console.log(`   ✅ Fully configurable - just inject the provider!`);
  console.log('');
});

// Demo 5: Order Execution Reusability
console.log('✅ Demo 5: Order Execution Interface - Perfect Reusability');
console.log('--------------------------------------------------------');

const orderExecutionConfigs = [
  {
    type: 'MOCK',
    config: {
      initialBalance: 100000,
      commission: 0.001
    },
    description: 'Mock order execution for backtesting'
  },
  {
    type: 'GROWW',
    config: {
      apiKey: 'your-api-key',
      accountId: 'your-account-id'
    },
    description: 'Groww broker order execution'
  }
];

orderExecutionConfigs.forEach(config => {
  console.log(`📊 Order Execution: ${config.type}`);
  console.log(`   Config: ${JSON.stringify(config.config, null, 2)}`);
  console.log(`   Usage: orderExecution.placeBuyOrder(orderRequest)`);
  console.log(`   ✅ Fully configurable - just inject the provider!`);
  console.log('');
});

// Demo 6: Current Strategy Service Issues
console.log('❌ Demo 6: Current Strategy Services - Limited Reusability');
console.log('--------------------------------------------------------');

const strategyIssues = [
  {
    service: 'EmaGapAtrStrategyService',
    interface: 'evaluate(config: EmaGapAtrConfig, candles: CandleQueryResult[]): StrategyEvaluation',
    issues: ['Sync method', 'Specific config type', 'Specific return type']
  },
  {
    service: 'AdvancedATRStrategyService',
    interface: 'evaluate(config: AdvancedATRConfig, candles: CandleQueryResult[]): StrategyEvaluation',
    issues: ['Sync method', 'Specific config type', 'Specific return type']
  },
  {
    service: 'NiftyOptionSellingService',
    interface: 'evaluateStrategy(strategy: NiftyOptionStrategy, context: {...}): Promise<{signals, actions}>',
    issues: ['Async method', 'Different config type', 'Different return type', 'Different method name']
  }
];

strategyIssues.forEach(strategy => {
  console.log(`📊 Strategy: ${strategy.service}`);
  console.log(`   Interface: ${strategy.interface}`);
  console.log(`   Issues: ${strategy.issues.join(', ')}`);
  console.log(`   ❌ Not reusable - different interfaces!`);
  console.log('');
});

// Demo 7: Recommended Unified Strategy Interface
console.log('✅ Demo 7: Recommended Unified Strategy Interface');
console.log('-------------------------------------------------');

const unifiedStrategyExample = {
  interface: 'IStrategy',
  methods: [
    'evaluate(config: StrategyConfig, candles: CandleData[], context?: StrategyContext): Promise<StrategyEvaluation>',
    'validateConfig(config: any): ValidationResult',
    'getDefaultConfig(): StrategyConfig'
  ],
  properties: [
    'readonly name: string',
    'readonly version: string',
    'readonly description: string'
  ]
};

console.log(`📊 Unified Strategy Interface: ${unifiedStrategyExample.interface}`);
console.log(`   Methods:`);
unifiedStrategyExample.methods.forEach(method => {
  console.log(`     - ${method}`);
});
console.log(`   Properties:`);
unifiedStrategyExample.properties.forEach(prop => {
  console.log(`     - ${prop}`);
});
console.log(`   ✅ All strategies implement same interface!`);
console.log('');

// Demo 8: Configuration-Driven Strategy Selection
console.log('✅ Demo 8: Configuration-Driven Strategy Selection');
console.log('-------------------------------------------------');

const strategySelectionConfigs = [
  {
    strategyName: 'ema-gap-atr',
    strategyConfig: {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      rsiPeriod: 14,
      rsiEntryLong: 50,
      rsiEntryShort: 50
    },
    description: 'EMA Gap ATR Strategy'
  },
  {
    strategyName: 'advanced-atr',
    strategyConfig: {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.002,
      pyramidingEnabled: true,
      exitMode: 'LIFO'
    },
    description: 'Advanced ATR Strategy with Supertrend'
  },
  {
    strategyName: 'nifty-options',
    strategyConfig: {
      options: { enabled: true },
      strikeSelection: { callStrikes: ['ATM'], putStrikes: ['ATM'] },
      expiry: 'weekly'
    },
    description: 'Nifty Options Strategy'
  }
];

strategySelectionConfigs.forEach(config => {
  console.log(`📊 Strategy: ${config.strategyName}`);
  console.log(`   Config: ${JSON.stringify(config.strategyConfig, null, 2)}`);
  console.log(`   Usage: strategyFactory.getStrategy('${config.strategyName}').evaluate(config, candles)`);
  console.log(`   ✅ Fully configurable - just pass strategy name and config!`);
  console.log('');
});

// Demo 9: Complete Framework Configuration
console.log('✅ Demo 9: Complete Framework Configuration');
console.log('------------------------------------------');

const completeFrameworkConfig = {
  strategy: {
    name: 'advanced-atr',
    config: {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
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
      trailingStopATRMultiplier: 2.0
    }
  },
  dataProvider: {
    type: 'CSV',
    config: {
      dataDir: '/path/to/data',
      symbol: 'NIFTY',
      timeframe: '15m'
    }
  },
  orderExecution: {
    type: 'MOCK',
    config: {
      initialBalance: 100000,
      commission: 0.001
    }
  },
  riskManagement: {
    maxLots: 15,
    maxLossPct: 0.05,
    positionSizingMode: 'CONSERVATIVE'
  }
};

console.log(`📊 Complete Framework Configuration:`);
console.log(JSON.stringify(completeFrameworkConfig, null, 2));
console.log('');
console.log(`✅ Everything configurable via single config object!`);
console.log(`✅ Framework automatically:`);
console.log(`   - Selects strategy by name`);
console.log(`   - Selects data provider by type`);
console.log(`   - Selects order execution by type`);
console.log(`   - Configures all components`);
console.log('');

// Summary
console.log('📊 FRAMEWORK REUSABILITY SUMMARY');
console.log('=================================');
console.log('');
console.log('✅ HIGHLY REUSABLE COMPONENTS (9-10/10):');
console.log('   - Exit Strategy Factory: Perfect factory pattern');
console.log('   - Trailing Stop Factory: Configuration-driven');
console.log('   - Data Provider Interface: Clean abstraction');
console.log('   - Order Execution Interface: Clean abstraction');
console.log('   - Strategy Building Blocks: Highly configurable');
console.log('');
console.log('❌ LIMITED REUSABILITY (2-4/10):');
console.log('   - Strategy Services: Inconsistent interfaces');
console.log('   - Strategy Selection: Hardcoded logic');
console.log('');
console.log('🎯 WITH RECOMMENDED IMPROVEMENTS (9.5/10):');
console.log('   - Unified Strategy Interface: All strategies same interface');
console.log('   - Strategy Factory: Configuration-driven selection');
console.log('   - Provider Factory: Configuration-driven selection');
console.log('   - Complete Framework: Everything configurable');
console.log('');
console.log('🚀 BENEFITS:');
console.log('   - Maximum Reusability: All constructs reusable with config');
console.log('   - Fully Extensible: Easy to add new components');
console.log('   - Configuration-Driven: Everything controlled via config');
console.log('   - SOLID Principles: Clean, maintainable architecture');
console.log('   - Dependency Injection: Fully injectable and testable');
console.log('');
console.log('✅ Framework is already quite reusable for trading components!');
console.log('🎯 Needs strategy unification for maximum reusability!');


