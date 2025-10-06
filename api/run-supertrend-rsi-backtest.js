#!/usr/bin/env node

/**
 * Supertrend + RSI Strategy Backtest
 * 
 * This script runs a backtest with:
 * - Supertrend(10, 2) for trend following
 * - RSI for entry/exit filtering
 * - 1-hour timeframe for fewer trades
 * - No ATR pyramiding for cleaner strategy
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATA_PROVIDER_MODE = 'csv';
process.env.CSV_DATA_DIR = path.join(__dirname, 'data');

console.log('🎯 SUPERTREND + RSI STRATEGY BACKTEST');
console.log('=====================================\n');

// Optimized Supertrend + RSI Configuration
const optimizedConfig = {
  // Core Strategy Parameters
  symbol: 'NIFTY',
  timeframe: '15m', // Start with 15m data, then we can create 1h data
  initialBalance: 100000,
  
  // Supertrend Parameters
  supertrendPeriod: 10,
  supertrendMultiplier: 2.0,
  
  // RSI Parameters (as discussed)
  rsiPeriod: 14,
  rsiEntryLong: 50,    // Entry when RSI > 50 (bullish)
  rsiEntryShort: 50,   // Entry when RSI < 50 (bearish)
  rsiExitLong: 65,     // Exit long when RSI > 65 (overbought)
  rsiExitShort: 35,    // Exit short when RSI < 35 (oversold)
  
  // ATR Parameters (for Supertrend calculation)
  atrPeriod: 14,
  
  // Strategy Settings
  pyramidingEnabled: false,        // Disable ATR pyramiding
  maxPyramidingPositions: 1,       // Single position only
  exitMode: 'FIFO',                // First In, First Out
  
  // Risk Management
  maxLots: 10,
  maxLossPct: 0.05,               // 5% max loss
  positionSize: 1,
  
  // Trailing Stop (optional)
  trailingStopEnabled: true,
  trailingStopType: 'ATR',
  trailingStopATRMultiplier: 2.0,
  trailingStopActivationProfit: 0.01, // 1% profit to activate
  
  // Backtest Settings
  commission: 0.001,               // 0.1% commission
  slippage: 0.0005,               // 0.05% slippage
  startDate: '2024-01-01',
  endDate: '2024-03-31'
};

console.log('📊 Strategy Configuration:');
console.log('==========================');
console.log(`Symbol: ${optimizedConfig.symbol}`);
console.log(`Timeframe: ${optimizedConfig.timeframe}`);
console.log(`Supertrend: Period=${optimizedConfig.supertrendPeriod}, Multiplier=${optimizedConfig.supertrendMultiplier}`);
console.log(`RSI: Period=${optimizedConfig.rsiPeriod}, Entry=${optimizedConfig.rsiEntryLong}/${optimizedConfig.rsiEntryShort}, Exit=${optimizedConfig.rsiExitLong}/${optimizedConfig.rsiExitShort}`);
console.log(`Pyramiding: ${optimizedConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
console.log(`Exit Mode: ${optimizedConfig.exitMode}`);
console.log(`Max Lots: ${optimizedConfig.maxLots}`);
console.log(`Max Loss: ${optimizedConfig.maxLossPct * 100}%`);
console.log(`Trailing Stop: ${optimizedConfig.trailingStopEnabled ? 'Enabled' : 'Disabled'}`);
console.log('');

// Run the backtest
async function runSupertrendRSIBacktest() {
  try {
    console.log('🚀 Starting Supertrend + RSI Strategy Backtest...');
    console.log('================================================\n');
    
    // Import all required services
    const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
    const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
    const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');
    const { BacktestValidationService } = require('./dist/src/modules/backtest/services/backtest-validation.service');
    const { BacktestSafetyService } = require('./dist/src/modules/backtest/services/backtest-safety.service');
    const { BacktestDataService } = require('./dist/src/modules/backtest/services/backtest-data.service');
    const { BacktestMetricsService } = require('./dist/src/modules/backtest/services/backtest-metrics.service');
    const { ExitStrategyFactory } = require('./dist/src/modules/strategy/strategies/exit-strategy-factory');
    const { TrailingStopService } = require('./dist/src/modules/strategy/components/trailing-stop.service');
    const { EmaGapAtrStrategyService } = require('./dist/src/modules/strategy/services/ema-gap-atr-strategy.service');
    const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
    
    // Initialize all dependencies
    const dataProvider = new CsvDataProvider();
    const orderExecution = new MockOrderExecutionProvider();
    const validationService = new BacktestValidationService();
    const safetyService = new BacktestSafetyService();
    const dataService = new BacktestDataService();
    const metricsService = new BacktestMetricsService();
    const exitStrategyFactory = new ExitStrategyFactory();
    const trailingStopService = new TrailingStopService();
    const emaGapAtrStrategyService = new EmaGapAtrStrategyService();
    const advancedATRStrategyService = new AdvancedATRStrategyService();
    
    // Create backtest orchestrator with all dependencies
    const backtestOrchestrator = new BacktestOrchestratorService(
      dataProvider,
      orderExecution,
      emaGapAtrStrategyService,
      advancedATRStrategyService,
      validationService,
      safetyService,
      dataService,
      metricsService,
      exitStrategyFactory,
      trailingStopService
    );
    
    console.log('✅ Services initialized successfully');
    
    // Prepare backtest configuration
    const backtestConfig = {
      symbol: optimizedConfig.symbol,
      timeframe: optimizedConfig.timeframe,
      startDate: new Date(optimizedConfig.startDate),
      endDate: new Date(optimizedConfig.endDate),
      initialBalance: optimizedConfig.initialBalance,
      strategyConfig: {
        // Supertrend parameters
        supertrendPeriod: optimizedConfig.supertrendPeriod,
        supertrendMultiplier: optimizedConfig.supertrendMultiplier,
        
        // RSI parameters
        rsiPeriod: optimizedConfig.rsiPeriod,
        rsiEntryLong: optimizedConfig.rsiEntryLong,
        rsiEntryShort: optimizedConfig.rsiEntryShort,
        rsiExitLong: optimizedConfig.rsiExitLong,
        rsiExitShort: optimizedConfig.rsiExitShort,
        
        // ATR parameters
        atrPeriod: optimizedConfig.atrPeriod,
        
        // Strategy settings
        pyramidingEnabled: optimizedConfig.pyramidingEnabled,
        maxPyramidingPositions: optimizedConfig.maxPyramidingPositions,
        exitMode: optimizedConfig.exitMode,
        
        // Risk management
        maxLots: optimizedConfig.maxLots,
        maxLossPct: optimizedConfig.maxLossPct,
        positionSize: optimizedConfig.positionSize,
        
        // Trailing stop
        trailingStopEnabled: optimizedConfig.trailingStopEnabled,
        trailingStopType: optimizedConfig.trailingStopType,
        trailingStopATRMultiplier: optimizedConfig.trailingStopATRMultiplier,
        trailingStopActivationProfit: optimizedConfig.trailingStopActivationProfit,
        
        // Disable ATR pyramiding
        atrRequiredForEntry: false,
        atrExpansionThreshold: 0,
        atrDeclineThreshold: 0,
      },
      commission: optimizedConfig.commission,
      slippage: optimizedConfig.slippage
    };
    
    console.log('📋 Backtest Configuration:');
    console.log(`  Symbol: ${backtestConfig.symbol}`);
    console.log(`  Timeframe: ${backtestConfig.timeframe}`);
    console.log(`  Period: ${backtestConfig.startDate.toISOString().split('T')[0]} to ${backtestConfig.endDate.toISOString().split('T')[0]}`);
    console.log(`  Initial Balance: ₹${backtestConfig.initialBalance.toLocaleString()}`);
    console.log(`  Commission: ${(backtestConfig.commission * 100).toFixed(2)}%`);
    console.log(`  Slippage: ${(backtestConfig.slippage * 100).toFixed(2)}%`);
    console.log('');
    
    // Run the backtest
    console.log('🔄 Running backtest...');
    const startTime = Date.now();
    
    const results = await backtestOrchestrator.runBacktest(backtestConfig);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log('✅ Backtest completed successfully!');
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    console.log('');
    
    // Display results
    console.log('📊 BACKTEST RESULTS:');
    console.log('===================');
    
    if (!results) {
      console.log('❌ No results returned from backtest');
      return;
    }
    
    console.log(`Initial Capital: ₹${(results.initialCapital || 0).toLocaleString()}`);
    console.log(`Final Capital: ₹${(results.finalCapital || 0).toLocaleString()}`);
    console.log(`Total Return: ₹${(results.totalReturn || 0).toLocaleString()} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
    console.log(`Total Trades: ${results.totalTrades || 0}`);
    console.log(`Winning Trades: ${results.winningTrades || 0}`);
    console.log(`Losing Trades: ${results.losingTrades || 0}`);
    console.log(`Win Rate: ${((results.winRate || 0) * 100).toFixed(2)}%`);
    console.log(`Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
    console.log(`Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
    console.log(`Profit Factor: ${(results.profitFactor || 0).toFixed(2)}`);
    console.log(`Max Drawdown: ${((results.maxDrawdown || 0) * 100).toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${(results.sharpeRatio || 0).toFixed(2)}`);
    console.log(`Max Win: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`Max Loss: ₹${(results.maxLoss || 0).toFixed(2)}`);
    console.log('');
    
    // Strategy Analysis
    console.log('📈 STRATEGY ANALYSIS:');
    console.log('====================');
    console.log(`Strategy: Supertrend(${optimizedConfig.supertrendPeriod}, ${optimizedConfig.supertrendMultiplier}) + RSI(${optimizedConfig.rsiPeriod})`);
    console.log(`Timeframe: ${optimizedConfig.timeframe}`);
    console.log(`Pyramiding: ${optimizedConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Exit Mode: ${optimizedConfig.exitMode}`);
    console.log(`Trailing Stop: ${optimizedConfig.trailingStopEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('');
    
    // Performance Metrics
    console.log('🎯 PERFORMANCE METRICS:');
    console.log('======================');
    const annualizedReturn = ((results.totalReturnPercentage || 0) / ((new Date(optimizedConfig.endDate) - new Date(optimizedConfig.startDate)) / (365 * 24 * 60 * 60 * 1000))).toFixed(2);
    console.log(`Annualized Return: ${annualizedReturn}%`);
    console.log(`Return per Trade: ${((results.totalReturnPercentage || 0) / Math.max(results.totalTrades || 1, 1)).toFixed(2)}%`);
    console.log(`Risk-Adjusted Return: ${((results.totalReturnPercentage || 0) / Math.max(results.maxDrawdownPercentage || 0.01, 0.01)).toFixed(2)}`);
    console.log('');
    
    // Trade Analysis
    if ((results.totalTrades || 0) > 0) {
      console.log('📊 TRADE ANALYSIS:');
      console.log('=================');
      const avgDuration = (results.totalTrades > 0 && results.trades) ? 
        results.trades.reduce((sum, trade) => sum + (trade.duration || 0), 0) / results.totalTrades / (1000 * 60 * 60) : 0;
      console.log(`Average Trade Duration: ${avgDuration.toFixed(2)} hours`);
      console.log(`Best Trade: ₹${(results.maxWin || 0).toFixed(2)}`);
      console.log(`Worst Trade: ₹${(results.maxLoss || 0).toFixed(2)}`);
      console.log(`Win/Loss Ratio: ${((results.averageWin || 0) / Math.abs(results.averageLoss || 1)).toFixed(2)}`);
      console.log('');
    }
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    if ((results.winRate || 0) < 40) {
      console.log('⚠️  Low win rate - consider adjusting RSI thresholds');
    }
    if ((results.profitFactor || 0) < 1.2) {
      console.log('⚠️  Low profit factor - consider improving exit strategy');
    }
    if ((results.maxDrawdownPercentage || 0) > 10) {
      console.log('⚠️  High drawdown - consider adding stop loss');
    }
    if ((results.totalTrades || 0) < 10) {
      console.log('ℹ️  Few trades - consider testing with longer period or different parameters');
    }
    if ((results.winRate || 0) >= 50 && (results.profitFactor || 0) >= 1.5) {
      console.log('✅ Good strategy performance!');
    }
    console.log('');
    
    console.log('🎯 Supertrend + RSI Strategy Backtest Complete!');
    
  } catch (error) {
    console.error('❌ Backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the backtest
runSupertrendRSIBacktest();
