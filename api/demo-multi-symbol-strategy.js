#!/usr/bin/env node

/**
 * Multi-Symbol Strategy Framework Demonstration
 * 
 * This script demonstrates how the same strategy can be used
 * with different parameters for different symbols (NIFTY vs BANKNIFTY).
 */

console.log('🎯 MULTI-SYMBOL STRATEGY FRAMEWORK DEMO');
console.log('=====================================\n');

// Demo 1: Same Strategy, Different Symbols
console.log('✅ Demo 1: Same Strategy, Different Symbols');
console.log('-------------------------------------------');

const multiSymbolConfig = {
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
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0
      },
      riskManagement: {
        maxLots: 15,
        maxLossPct: 0.05,
        positionSizingMode: 'CONSERVATIVE',
        stopLossPct: 0.02,
        takeProfitPct: 0.03
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
        trailingStopEnabled: true,
        trailingStopType: 'PERCENTAGE',
        trailingStopPercentage: 0.015
      },
      riskManagement: {
        maxLots: 10,
        maxLossPct: 0.03,
        positionSizingMode: 'AGGRESSIVE',
        stopLossPct: 0.015,
        takeProfitPct: 0.025
      }
    }
  ],
  globalConfig: {
    maxConcurrentPositions: 2,
    maxTotalRisk: 0.08,
    correlationLimit: 0.7
  }
};

console.log('📊 Multi-Symbol Strategy Configuration:');
console.log(JSON.stringify(multiSymbolConfig, null, 2));
console.log('');

// Demo 2: Strategy Parameter Comparison
console.log('✅ Demo 2: Strategy Parameter Comparison');
console.log('---------------------------------------');

const parameterComparison = [
  {
    parameter: 'EMA Fast Period',
    NIFTY: 9,
    BANKNIFTY: 5,
    reason: 'BANKNIFTY more volatile, needs faster EMA'
  },
  {
    parameter: 'EMA Slow Period',
    NIFTY: 21,
    BANKNIFTY: 13,
    reason: 'BANKNIFTY needs shorter lookback period'
  },
  {
    parameter: 'RSI Entry Long',
    NIFTY: 50,
    BANKNIFTY: 40,
    reason: 'BANKNIFTY more volatile, lower RSI threshold'
  },
  {
    parameter: 'RSI Exit Long',
    NIFTY: 65,
    BANKNIFTY: 80,
    reason: 'BANKNIFTY can run longer, higher RSI exit'
  },
  {
    parameter: 'Max Lots',
    NIFTY: 15,
    BANKNIFTY: 10,
    reason: 'BANKNIFTY higher risk, lower position size'
  },
  {
    parameter: 'Max Loss %',
    NIFTY: 5,
    BANKNIFTY: 3,
    reason: 'BANKNIFTY more volatile, tighter risk control'
  },
  {
    parameter: 'Exit Mode',
    NIFTY: 'LIFO',
    BANKNIFTY: 'FIFO',
    reason: 'Different exit strategies for different risk profiles'
  },
  {
    parameter: 'Trailing Stop Type',
    NIFTY: 'ATR',
    BANKNIFTY: 'PERCENTAGE',
    reason: 'Different trailing stop methods for different volatility'
  }
];

parameterComparison.forEach(param => {
  console.log(`📊 ${param.parameter}:`);
  console.log(`   NIFTY: ${param.NIFTY}`);
  console.log(`   BANKNIFTY: ${param.BANKNIFTY}`);
  console.log(`   Reason: ${param.reason}`);
  console.log('');
});

// Demo 3: Risk Management Comparison
console.log('✅ Demo 3: Risk Management Comparison');
console.log('-------------------------------------');

const riskManagementComparison = {
  NIFTY: {
    maxLots: 15,
    maxLossPct: 0.05,
    positionSizingMode: 'CONSERVATIVE',
    stopLossPct: 0.02,
    takeProfitPct: 0.03,
    description: 'Conservative approach for stable NIFTY'
  },
  BANKNIFTY: {
    maxLots: 10,
    maxLossPct: 0.03,
    positionSizingMode: 'AGGRESSIVE',
    stopLossPct: 0.015,
    takeProfitPct: 0.025,
    description: 'Aggressive but controlled approach for volatile BANKNIFTY'
  }
};

Object.entries(riskManagementComparison).forEach(([symbol, risk]) => {
  console.log(`📊 ${symbol} Risk Management:`);
  console.log(`   Max Lots: ${risk.maxLots}`);
  console.log(`   Max Loss %: ${risk.maxLossPct * 100}%`);
  console.log(`   Position Sizing: ${risk.positionSizingMode}`);
  console.log(`   Stop Loss %: ${risk.stopLossPct * 100}%`);
  console.log(`   Take Profit %: ${risk.takeProfitPct * 100}%`);
  console.log(`   Strategy: ${risk.description}`);
  console.log('');
});

// Demo 4: Framework Usage
console.log('✅ Demo 4: Framework Usage');
console.log('-------------------------');

console.log('📊 How to use the Multi-Symbol Strategy Framework:');
console.log('');
console.log('1. Define Multi-Symbol Configuration:');
console.log('   const config = {');
console.log('     strategyName: "advanced-atr",');
console.log('     symbols: [');
console.log('       { symbol: "NIFTY", strategyConfig: {...}, riskManagement: {...} },');
console.log('       { symbol: "BANKNIFTY", strategyConfig: {...}, riskManagement: {...} }');
console.log('     ]');
console.log('   };');
console.log('');
console.log('2. Create Multi-Symbol Strategy:');
console.log('   const instances = await multiSymbolStrategyFactory.createMultiSymbolStrategy(config);');
console.log('');
console.log('3. Run Strategy on All Symbols:');
console.log('   const results = await orchestrator.runMultiSymbolStrategy(config, startDate, endDate);');
console.log('');
console.log('4. Get Symbol-Specific Results:');
console.log('   const niftyResult = results.symbolResults.get("NIFTY");');
console.log('   const bankniftyResult = results.symbolResults.get("BANKNIFTY");');
console.log('');

// Demo 5: Expected Results
console.log('✅ Demo 5: Expected Results');
console.log('--------------------------');

const expectedResults = {
  NIFTY: {
    totalTrades: 150,
    winRate: 0.65,
    totalReturn: 0.25,
    maxDrawdown: 0.08,
    avgWin: 120,
    avgLoss: -80,
    description: 'Conservative NIFTY strategy with steady returns'
  },
  BANKNIFTY: {
    totalTrades: 200,
    winRate: 0.55,
    totalReturn: 0.35,
    maxDrawdown: 0.12,
    avgWin: 150,
    avgLoss: -100,
    description: 'Aggressive BANKNIFTY strategy with higher volatility'
  },
  Portfolio: {
    totalReturn: 0.30,
    sharpeRatio: 1.2,
    maxDrawdown: 0.10,
    correlation: 0.65,
    description: 'Combined portfolio with diversification benefits'
  }
};

Object.entries(expectedResults).forEach(([symbol, result]) => {
  console.log(`📊 ${symbol} Expected Results:`);
  console.log(`   Total Trades: ${result.totalTrades}`);
  console.log(`   Win Rate: ${(result.winRate * 100).toFixed(1)}%`);
  console.log(`   Total Return: ${(result.totalReturn * 100).toFixed(1)}%`);
  console.log(`   Max Drawdown: ${(result.maxDrawdown * 100).toFixed(1)}%`);
  if (result.avgWin) {
    console.log(`   Avg Win: ₹${result.avgWin}`);
    console.log(`   Avg Loss: ₹${result.avgLoss}`);
  }
  if (result.sharpeRatio) {
    console.log(`   Sharpe Ratio: ${result.sharpeRatio}`);
  }
  if (result.correlation) {
    console.log(`   Correlation: ${result.correlation}`);
  }
  console.log(`   Description: ${result.description}`);
  console.log('');
});

// Demo 6: Benefits
console.log('✅ Demo 6: Benefits of Multi-Symbol Framework');
console.log('-------------------------------------------');

const benefits = [
  {
    benefit: 'Same Strategy Logic',
    description: 'Reuse strategy implementation across symbols',
    example: 'EMA crossover logic works for both NIFTY and BANKNIFTY'
  },
  {
    benefit: 'Symbol-Specific Parameters',
    description: 'Different configs per symbol',
    example: 'NIFTY: EMA(9,21), BANKNIFTY: EMA(5,13)'
  },
  {
    benefit: 'Symbol-Specific Risk Management',
    description: 'Different risk profiles per symbol',
    example: 'NIFTY: 5% max loss, BANKNIFTY: 3% max loss'
  },
  {
    benefit: 'Symbol-Specific Data Providers',
    description: 'Different data sources per symbol',
    example: 'NIFTY: CSV data, BANKNIFTY: Live data'
  },
  {
    benefit: 'Cross-Symbol Analysis',
    description: 'Portfolio-level metrics and correlation',
    example: 'Diversification benefits, correlation analysis'
  },
  {
    benefit: 'Easy Symbol Addition',
    description: 'Add new symbols without code changes',
    example: 'Add FINNIFTY with just configuration'
  }
];

benefits.forEach((benefit, index) => {
  console.log(`${index + 1}. ${benefit.benefit}:`);
  console.log(`   ${benefit.description}`);
  console.log(`   Example: ${benefit.example}`);
  console.log('');
});

// Demo 7: Real-World Use Cases
console.log('✅ Demo 7: Real-World Use Cases');
console.log('------------------------------');

const useCases = [
  {
    scenario: 'NIFTY vs BANKNIFTY Trading',
    description: 'Same strategy, different parameters for different volatility',
    config: {
      NIFTY: 'Conservative parameters for stable NIFTY',
      BANKNIFTY: 'Aggressive parameters for volatile BANKNIFTY'
    }
  },
  {
    scenario: 'Different Timeframes',
    description: 'Same strategy, different timeframes per symbol',
    config: {
      NIFTY: '15m timeframe for swing trading',
      BANKNIFTY: '5m timeframe for scalping'
    }
  },
  {
    scenario: 'Different Risk Profiles',
    description: 'Same strategy, different risk management per symbol',
    config: {
      NIFTY: 'Conservative risk management',
      BANKNIFTY: 'Aggressive risk management'
    }
  },
  {
    scenario: 'Different Data Sources',
    description: 'Same strategy, different data providers per symbol',
    config: {
      NIFTY: 'CSV data for backtesting',
      BANKNIFTY: 'Live data for real trading'
    }
  },
  {
    scenario: 'Portfolio Diversification',
    description: 'Same strategy across multiple symbols for diversification',
    config: {
      symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
      correlationLimit: 0.7,
      maxTotalRisk: 0.10
    }
  }
];

useCases.forEach((useCase, index) => {
  console.log(`${index + 1}. ${useCase.scenario}:`);
  console.log(`   ${useCase.description}`);
  console.log(`   Configuration: ${JSON.stringify(useCase.config, null, 2)}`);
  console.log('');
});

// Summary
console.log('📊 MULTI-SYMBOL STRATEGY FRAMEWORK SUMMARY');
console.log('==========================================');
console.log('');
console.log('✅ CURRENT FRAMEWORK CAPABILITIES:');
console.log('   - Symbol-aware data providers ✅');
console.log('   - Strategy entities with symbol field ✅');
console.log('   - Strategy runner with symbol context ✅');
console.log('   - Basic multi-symbol support ✅');
console.log('');
console.log('❌ MISSING CAPABILITIES:');
console.log('   - Symbol-specific strategy parameters ❌');
console.log('   - Symbol-specific risk management ❌');
console.log('   - Multi-symbol strategy orchestration ❌');
console.log('   - Cross-symbol analysis ❌');
console.log('');
console.log('🎯 RECOMMENDED IMPROVEMENTS:');
console.log('   - Multi-Symbol Strategy Configuration ✅');
console.log('   - Symbol-Specific Strategy Instances ✅');
console.log('   - Multi-Symbol Strategy Orchestrator ✅');
console.log('   - Cross-Symbol Risk Management ✅');
console.log('   - Cross-Symbol Analysis ✅');
console.log('');
console.log('🚀 BENEFITS:');
console.log('   - Same strategy logic across symbols');
console.log('   - Different parameters per symbol (NIFTY vs BANKNIFTY)');
console.log('   - Different risk management per symbol');
console.log('   - Different data providers per symbol');
console.log('   - Cross-symbol analysis and diversification');
console.log('   - Easy symbol addition without code changes');
console.log('');
console.log('✅ Framework will be perfect for NIFTY vs BANKNIFTY trading!');
console.log('🎯 Same strategy, different rules per symbol!');


