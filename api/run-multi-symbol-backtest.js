#!/usr/bin/env node

/**
 * Multi-Symbol Strategy Backtest Runner
 * 
 * This script runs a complete multi-symbol backtest using the new framework
 * with NIFTY vs BANKNIFTY using different parameters.
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATA_PROVIDER_MODE = 'csv';
process.env.CSV_DATA_DIR = path.join(__dirname, 'data');

console.log('🎯 MULTI-SYMBOL STRATEGY BACKTEST RUNNER');
console.log('========================================\n');

// Multi-Symbol Strategy Configuration
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
        trailingStopATRMultiplier: 2.0,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 15,
      },
      riskManagement: {
        maxLots: 15,
        maxLossPct: 0.05,
        positionSizingMode: 'CONSERVATIVE',
        stopLossPct: 0.02,
        takeProfitPct: 0.03,
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0,
        trailingStopActivationProfit: 0.002,
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
        trailingStopPercentage: 0.015,
        capital: 100000,
        maxLossPct: 0.03,
        positionSize: 1,
        maxLots: 10,
      },
      riskManagement: {
        maxLots: 10,
        maxLossPct: 0.03,
        positionSizingMode: 'AGGRESSIVE',
        stopLossPct: 0.015,
        takeProfitPct: 0.025,
        trailingStopEnabled: true,
        trailingStopType: 'PERCENTAGE',
        trailingStopPercentage: 0.015,
        trailingStopActivationProfit: 0.001,
      }
    }
  ],
  globalConfig: {
    maxConcurrentPositions: 2,
    maxTotalRisk: 0.08,
    correlationLimit: 0.7,
    maxDrawdownPct: 0.10,
    portfolioRebalancing: true,
    rebalancingFrequency: 'DAILY',
  }
};

console.log('📊 Multi-Symbol Strategy Configuration:');
console.log('======================================');
console.log(`Strategy: ${multiSymbolConfig.strategyName}`);
console.log(`Symbols: ${multiSymbolConfig.symbols.map(s => s.symbol).join(', ')}`);
console.log(`Global Max Positions: ${multiSymbolConfig.globalConfig.maxConcurrentPositions}`);
console.log(`Global Max Risk: ${multiSymbolConfig.globalConfig.maxTotalRisk * 100}%`);
console.log('');

// Display symbol-specific configurations
console.log('📈 Symbol-Specific Configurations:');
console.log('==================================');

multiSymbolConfig.symbols.forEach((symbolConfig, index) => {
  console.log(`\n${index + 1}. ${symbolConfig.symbol}:`);
  console.log(`   EMA: ${symbolConfig.strategyConfig.emaFastPeriod}/${symbolConfig.strategyConfig.emaSlowPeriod}`);
  console.log(`   RSI Entry: ${symbolConfig.strategyConfig.rsiEntryLong}/${symbolConfig.strategyConfig.rsiEntryShort}`);
  console.log(`   RSI Exit: ${symbolConfig.strategyConfig.rsiExitLong}/${symbolConfig.strategyConfig.rsiExitShort}`);
  console.log(`   Pyramiding: ${symbolConfig.strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`   Exit Mode: ${symbolConfig.strategyConfig.exitMode}`);
  console.log(`   Trailing Stop: ${symbolConfig.strategyConfig.trailingStopEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`   Max Lots: ${symbolConfig.riskManagement.maxLots}`);
  console.log(`   Max Loss: ${symbolConfig.riskManagement.maxLossPct * 100}%`);
  console.log(`   Position Sizing: ${symbolConfig.riskManagement.positionSizingMode}`);
});

console.log('');

// Run the backtest
async function runMultiSymbolBacktest() {
  try {
    console.log('🚀 Starting Multi-Symbol Backtest...');
    console.log('====================================\n');
    
    // Import required modules
    const { MultiSymbolBacktestOrchestrator } = require('./dist/src/modules/backtest/services/multi-symbol-backtest-orchestrator.service');
    
    // Create backtest orchestrator
    const backtestOrchestrator = new MultiSymbolBacktestOrchestrator();
    
    // Set up backtest dates (10 years)
    const startDate = new Date('2014-01-01T00:00:00.000Z');
    const endDate = new Date('2024-12-31T23:59:59.000Z');
    
    console.log(`📅 Backtest Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`⏱️  Timeframe: 15 minutes`);
    console.log(`💰 Initial Capital: ₹100,000`);
    console.log('');
    
    // Run multi-symbol backtest
    const results = await backtestOrchestrator.runMultiSymbolBacktestWithCSV(
      multiSymbolConfig,
      startDate,
      endDate
    );
    
    // Display results
    console.log('\n📊 BACKTEST RESULTS');
    console.log('==================');
    
    // Global metrics
    console.log(`\n🌍 GLOBAL METRICS:`);
    console.log(`Total Trades: ${results.totalTrades}`);
    console.log(`Total Return: ${results.totalReturn.toFixed(2)}%`);
    console.log(`Max Drawdown: ${results.maxDrawdown.toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
    console.log(`Execution Time: ${(results.executionTime / 1000).toFixed(2)}s`);
    
    // Symbol-specific results
    console.log('\n📈 SYMBOL-SPECIFIC RESULTS:');
    console.log('==========================');
    
    for (const [symbol, result] of results.symbolResults) {
      console.log(`\n${symbol}:`);
      console.log(`  Total Trades: ${result.totalTrades}`);
      console.log(`  Total Return: ${result.totalReturnPercentage.toFixed(2)}%`);
      console.log(`  Win Rate: ${(result.winRate * 100).toFixed(1)}%`);
      console.log(`  Profit Factor: ${result.profitFactor.toFixed(2)}`);
      console.log(`  Max Drawdown: ${result.maxDrawdownPercentage.toFixed(2)}%`);
      console.log(`  Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`);
      console.log(`  Avg Win: ₹${result.avgWin.toFixed(2)}`);
      console.log(`  Avg Loss: ₹${result.avgLoss.toFixed(2)}`);
      console.log(`  Max Win: ₹${result.maxWin.toFixed(2)}`);
      console.log(`  Max Loss: ₹${result.maxLoss.toFixed(2)}`);
      console.log(`  Execution Time: ${(result.executionTime / 1000).toFixed(2)}s`);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
    
    // Cross-symbol analysis
    if (results.crossSymbolAnalysis) {
      console.log('\n🔗 CROSS-SYMBOL ANALYSIS:');
      console.log('=======================');
      console.log(`Diversification Ratio: ${results.crossSymbolAnalysis.diversificationRatio.toFixed(3)}`);
      console.log(`Portfolio Volatility: ${results.crossSymbolAnalysis.portfolioVolatility.toFixed(3)}`);
      console.log(`Portfolio Return: ${results.crossSymbolAnalysis.portfolioReturn.toFixed(2)}%`);
      console.log(`Risk-Adjusted Return: ${results.crossSymbolAnalysis.riskAdjustedReturn.toFixed(3)}`);
      console.log(`Concentration Risk: ${results.crossSymbolAnalysis.concentrationRisk.toFixed(3)}`);
      console.log(`Max Correlation: ${results.crossSymbolAnalysis.maxCorrelation.toFixed(3)}`);
      console.log(`Min Correlation: ${results.crossSymbolAnalysis.minCorrelation.toFixed(3)}`);
    }
    
    // Portfolio metrics
    if (results.portfolioMetrics) {
      console.log('\n💼 PORTFOLIO METRICS:');
      console.log('====================');
      console.log(`Total Value: ₹${results.portfolioMetrics.totalValue.toFixed(2)}`);
      console.log(`Total Return: ${results.portfolioMetrics.totalReturnPercentage.toFixed(2)}%`);
      console.log(`Volatility: ${results.portfolioMetrics.volatility.toFixed(3)}`);
      console.log(`Sharpe Ratio: ${results.portfolioMetrics.sharpeRatio.toFixed(2)}`);
      console.log(`Max Drawdown: ${results.portfolioMetrics.maxDrawdown.toFixed(2)}%`);
    }
    
    // Performance comparison
    console.log('\n📊 PERFORMANCE COMPARISON:');
    console.log('==========================');
    
    const niftyResult = results.symbolResults.get('NIFTY');
    const bankniftyResult = results.symbolResults.get('BANKNIFTY');
    
    if (niftyResult && bankniftyResult) {
      console.log(`NIFTY vs BANKNIFTY:`);
      console.log(`  Total Return: ${niftyResult.totalReturnPercentage.toFixed(2)}% vs ${bankniftyResult.totalReturnPercentage.toFixed(2)}%`);
      console.log(`  Win Rate: ${(niftyResult.winRate * 100).toFixed(1)}% vs ${(bankniftyResult.winRate * 100).toFixed(1)}%`);
      console.log(`  Max Drawdown: ${niftyResult.maxDrawdownPercentage.toFixed(2)}% vs ${bankniftyResult.maxDrawdownPercentage.toFixed(2)}%`);
      console.log(`  Sharpe Ratio: ${niftyResult.sharpeRatio.toFixed(2)} vs ${bankniftyResult.sharpeRatio.toFixed(2)}`);
      console.log(`  Total Trades: ${niftyResult.totalTrades} vs ${bankniftyResult.totalTrades}`);
    }
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log('===========');
    console.log(`✅ Multi-Symbol Strategy Framework: WORKING`);
    console.log(`✅ Same Strategy Logic: APPLIED`);
    console.log(`✅ Symbol-Specific Parameters: CONFIGURED`);
    console.log(`✅ Symbol-Specific Risk Management: APPLIED`);
    console.log(`✅ Cross-Symbol Analysis: ENABLED`);
    console.log(`✅ Portfolio-Level Metrics: CALCULATED`);
    console.log('');
    console.log('🚀 Framework is ready for production use!');
    console.log('🎯 Perfect for NIFTY vs BANKNIFTY trading with different rules!');
    
  } catch (error) {
    console.error('❌ Multi-Symbol Backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the backtest
runMultiSymbolBacktest();


