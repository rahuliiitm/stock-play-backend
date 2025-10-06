#!/usr/bin/env node

/**
 * Debug Backtest Orchestrator
 * 
 * This script debugs the backtest orchestrator to see why it's returning 0 results
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATA_PROVIDER_MODE = 'csv';
process.env.CSV_DATA_DIR = path.join(__dirname, 'data');

console.log('🔍 DEBUG BACKTEST ORCHESTRATOR');
console.log('==============================\n');

async function debugBacktestOrchestrator() {
  try {
    // Import the backtest orchestrator
    const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
    const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
    const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');
    
    // Initialize services
    const dataProvider = new CsvDataProvider();
    const orderExecution = new MockOrderExecutionProvider();
    const backtestOrchestrator = new BacktestOrchestratorService();
    
    console.log('✅ Services initialized');
    
    // Test data loading
    console.log('📊 Testing data loading...');
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    
    const candles = await dataProvider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
    console.log(`📈 Loaded ${candles.length} candles`);
    
    if (candles.length === 0) {
      console.log('❌ No candles loaded - check data file');
      return;
    }
    
    console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString()} to ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
    console.log(`💰 Price range: ${Math.min(...candles.map(c => c.low)).toFixed(2)} - ${Math.max(...candles.map(c => c.high)).toFixed(2)}`);
    
    // Test backtest configuration
    const backtestConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: startDate,
      endDate: endDate,
      initialCapital: 100000,
      strategyConfig: {
        // Supertrend parameters
        supertrendPeriod: 10,
        supertrendMultiplier: 2.0,
        
        // RSI parameters
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 65,
        rsiExitShort: 35,
        
        // ATR parameters
        atrPeriod: 14,
        
        // Strategy settings
        pyramidingEnabled: false,
        maxPyramidingPositions: 1,
        exitMode: 'FIFO',
        
        // Risk management
        maxLots: 10,
        maxLossPct: 0.05,
        positionSize: 1,
        
        // Trailing stop
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0,
        trailingStopActivationProfit: 0.01,
        
        // ATR thresholds - set to 0 to disable ATR logic
        atrRequiredForEntry: false,
        atrExpansionThreshold: 0,
        atrDeclineThreshold: 0,
      },
      commission: 0.001,
      slippage: 0.0005
    };
    
    console.log('📋 Backtest Configuration:');
    console.log(`  Symbol: ${backtestConfig.symbol}`);
    console.log(`  Timeframe: ${backtestConfig.timeframe}`);
    console.log(`  Period: ${backtestConfig.startDate.toISOString().split('T')[0]} to ${backtestConfig.endDate.toISOString().split('T')[0]}`);
    console.log(`  Initial Capital: ₹${backtestConfig.initialCapital.toLocaleString()}`);
    console.log(`  Supertrend: Period=${backtestConfig.strategyConfig.supertrendPeriod}, Multiplier=${backtestConfig.strategyConfig.supertrendMultiplier}`);
    console.log(`  RSI: Entry=${backtestConfig.strategyConfig.rsiEntryLong}/${backtestConfig.strategyConfig.rsiEntryShort}, Exit=${backtestConfig.strategyConfig.rsiExitLong}/${backtestConfig.strategyConfig.rsiExitShort}`);
    console.log(`  ATR Thresholds: Expansion=${backtestConfig.strategyConfig.atrExpansionThreshold}, Decline=${backtestConfig.strategyConfig.atrDeclineThreshold}`);
    console.log('');
    
    // Test strategy selection logic
    console.log('🔧 Testing strategy selection logic...');
    const strategyConfig = backtestConfig.strategyConfig;
    const useAdvancedATR = strategyConfig.atrDeclineThreshold !== undefined || strategyConfig.atrExpansionThreshold !== undefined;
    console.log(`  atrDeclineThreshold: ${strategyConfig.atrDeclineThreshold}`);
    console.log(`  atrExpansionThreshold: ${strategyConfig.atrExpansionThreshold}`);
    console.log(`  Use Advanced ATR Strategy: ${useAdvancedATR}`);
    console.log('');
    
    // Test strategy evaluation directly
    console.log('🧪 Testing strategy evaluation directly...');
    const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
    const strategyService = new AdvancedATRStrategyService();
    
    // Test with first 100 candles
    const testCandles = candles.slice(0, 100);
    console.log(`📊 Testing with ${testCandles.length} candles`);
    
    const advancedConfig = {
      ...strategyConfig,
      atrDeclineThreshold: strategyConfig.atrDeclineThreshold || 0.1,
      atrExpansionThreshold: strategyConfig.atrExpansionThreshold || 0.1,
      trailingStopEnabled: strategyConfig.trailingStopEnabled || false,
      trailingStopType: strategyConfig.trailingStopType || 'ATR',
      trailingStopATRMultiplier: strategyConfig.trailingStopATRMultiplier || 2.0,
      trailingStopPercentage: strategyConfig.trailingStopPercentage || 0.02,
      trailingStopActivationProfit: strategyConfig.trailingStopActivationProfit || 0.01,
      maxTrailDistance: strategyConfig.maxTrailDistance || 0.05,
    };
    
    console.log('🔧 Advanced Config:');
    console.log(`  atrDeclineThreshold: ${advancedConfig.atrDeclineThreshold}`);
    console.log(`  atrExpansionThreshold: ${advancedConfig.atrExpansionThreshold}`);
    console.log(`  supertrendPeriod: ${advancedConfig.supertrendPeriod}`);
    console.log(`  supertrendMultiplier: ${advancedConfig.supertrendMultiplier}`);
    console.log('');
    
    const evaluation = await strategyService.evaluate(advancedConfig, testCandles);
    console.log(`📊 Strategy evaluation result:`);
    console.log(`  Signals: ${evaluation.signals.length}`);
    console.log(`  Debug: ${JSON.stringify(evaluation.debug, null, 2)}`);
    
    if (evaluation.signals.length > 0) {
      console.log('✅ Strategy is generating signals!');
      evaluation.signals.forEach((signal, index) => {
        console.log(`  Signal ${index + 1}: ${signal.type} ${signal.direction} at ${signal.data?.price}`);
      });
    } else {
      console.log('⚠️  No signals generated - checking strategy logic...');
    }
    
    // Now test the full backtest
    console.log('\n🔄 Running full backtest...');
    const startTime = Date.now();
    
    const results = await backtestOrchestrator.executeBacktest(
      backtestConfig,
      dataProvider,
      orderExecution
    );
    
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
    console.log(`Win Rate: ${(results.winRate || 0).toFixed(2)}%`);
    console.log(`Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
    console.log(`Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
    console.log(`Profit Factor: ${(results.profitFactor || 0).toFixed(2)}`);
    console.log(`Max Drawdown: ₹${(results.maxDrawdown || 0).toLocaleString()} (${(results.maxDrawdownPercentage || 0).toFixed(2)}%)`);
    console.log(`Sharpe Ratio: ${(results.sharpeRatio || 0).toFixed(2)}`);
    console.log(`Max Win: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`Max Loss: ₹${(results.maxLoss || 0).toFixed(2)}`);
    console.log('');
    
    // Show some trades if available
    if (results.trades && results.trades.length > 0) {
      console.log('📈 SAMPLE TRADES:');
      console.log('================');
      results.trades.slice(0, 5).forEach((trade, index) => {
        console.log(`Trade ${index + 1}: ${trade.direction} ${trade.quantity} @ ₹${trade.entryPrice.toFixed(2)} -> ₹${trade.exitPrice?.toFixed(2) || 'Open'} (${trade.pnl?.toFixed(2) || '0'}%)`);
      });
      if (results.trades.length > 5) {
        console.log(`... and ${results.trades.length - 5} more trades`);
      }
      console.log('');
    }
    
    console.log('🎯 Backtest Orchestrator Debug Complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugBacktestOrchestrator();


