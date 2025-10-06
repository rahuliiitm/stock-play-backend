#!/usr/bin/env node

/**
 * Debug Backtest Root Cause
 * 
 * This script comprehensively debugs the backtest orchestrator to find the root cause
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATA_PROVIDER_MODE = 'csv';
process.env.CSV_DATA_DIR = path.join(__dirname, 'data');

console.log('🔍 DEBUG BACKTEST ROOT CAUSE');
console.log('============================\n');

async function debugBacktestRootCause() {
  try {
    // Import all required services
    const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
    const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
    const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');
    const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
    const { EmaGapAtrStrategyService } = require('./dist/src/modules/strategy/services/ema-gap-atr-strategy.service');
    
    console.log('✅ All services imported successfully');
    
    // Initialize services
    const dataProvider = new CsvDataProvider();
    const orderExecution = new MockOrderExecutionProvider();
    const backtestOrchestrator = new BacktestOrchestratorService();
    const advancedATRStrategy = new AdvancedATRStrategyService();
    const emaGapAtrStrategy = new EmaGapAtrStrategyService();
    
    console.log('✅ All services initialized');
    
    // Test data loading
    console.log('\n📊 STEP 1: Testing data loading...');
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-05'); // 5 days for debugging
    
    const candles = await dataProvider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
    console.log(`📈 Loaded ${candles.length} candles`);
    
    if (candles.length === 0) {
      console.log('❌ No candles loaded - check data file');
      return;
    }
    
    console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString()} to ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
    console.log(`💰 Price range: ${Math.min(...candles.map(c => c.low)).toFixed(2)} - ${Math.max(...candles.map(c => c.high)).toFixed(2)}`);
    
    // Test strategy evaluation directly
    console.log('\n🧪 STEP 2: Testing strategy evaluation directly...');
    
    // Test with Advanced ATR Strategy (Supertrend)
    const advancedConfig = {
      id: 'debug-advanced-atr',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.1,
      atrExpansionThreshold: 0.1,
      atrRequiredForEntry: false,
      strongCandleThreshold: 0.5,
      gapUpDownThreshold: 0.02,
      rsiPeriod: 14,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 65,
      rsiExitShort: 35,
      slopeLookback: 5,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 10,
      pyramidingEnabled: false,
      exitMode: 'FIFO',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
      trailingStopEnabled: true,
      trailingStopType: 'ATR',
      trailingStopATRMultiplier: 2.0,
      trailingStopActivationProfit: 0.01,
      trailingStopPercentage: 0.02,
      maxTrailDistance: 0.05
    };
    
    console.log('🔧 Advanced ATR Strategy Config:');
    console.log(`  Supertrend: Period=${advancedConfig.supertrendPeriod}, Multiplier=${advancedConfig.supertrendMultiplier}`);
    console.log(`  RSI: Entry=${advancedConfig.rsiEntryLong}/${advancedConfig.rsiEntryShort}, Exit=${advancedConfig.rsiExitLong}/${advancedConfig.rsiExitShort}`);
    console.log(`  ATR: Expansion=${advancedConfig.atrExpansionThreshold}, Decline=${advancedConfig.atrDeclineThreshold}`);
    
    // Test with first 50 candles
    const testCandles = candles.slice(0, 50);
    console.log(`📊 Testing with ${testCandles.length} candles`);
    
    const evaluation = await advancedATRStrategy.evaluate(advancedConfig, testCandles);
    console.log(`📊 Advanced ATR Strategy evaluation result:`);
    console.log(`  Signals: ${evaluation.signals.length}`);
    console.log(`  Debug: ${JSON.stringify(evaluation.debug, null, 2)}`);
    
    if (evaluation.signals.length > 0) {
      console.log('✅ Advanced ATR Strategy is generating signals!');
      evaluation.signals.forEach((signal, index) => {
        console.log(`  Signal ${index + 1}: ${signal.type} ${signal.data?.direction} at ${signal.data?.price}`);
        console.log(`    Signal data: ${JSON.stringify(signal.data, null, 2)}`);
      });
    } else {
      console.log('⚠️  No signals from Advanced ATR Strategy');
    }
    
    // Test with Standard EMA-Gap-ATR Strategy
    console.log('\n🧪 STEP 3: Testing standard EMA-Gap-ATR strategy...');
    
    const standardConfig = {
      id: 'debug-standard-ema-gap-atr',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      strongCandleThreshold: 0.5,
      gapUpDownThreshold: 0.02,
      rsiPeriod: 14,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 70,
      rsiExitShort: 30,
      slopeLookback: 5,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 10,
      pyramidingEnabled: false,
      exitMode: 'FIFO'
    };
    
    console.log('🔧 Standard EMA-Gap-ATR Strategy Config:');
    console.log(`  EMA: Fast=${standardConfig.emaFastPeriod}, Slow=${standardConfig.emaSlowPeriod}`);
    console.log(`  RSI: Entry=${standardConfig.rsiEntryLong}/${standardConfig.rsiEntryShort}, Exit=${standardConfig.rsiExitLong}/${standardConfig.rsiExitShort}`);
    
    const standardEvaluation = await emaGapAtrStrategy.evaluate(standardConfig, testCandles);
    console.log(`📊 Standard EMA-Gap-ATR Strategy evaluation result:`);
    console.log(`  Signals: ${standardEvaluation.signals.length}`);
    
    if (standardEvaluation.signals.length > 0) {
      console.log('✅ Standard EMA-Gap-ATR Strategy is generating signals!');
      standardEvaluation.signals.forEach((signal, index) => {
        console.log(`  Signal ${index + 1}: ${signal.type} ${signal.data?.direction} at ${signal.data?.price}`);
      });
    } else {
      console.log('⚠️  No signals from Standard EMA-Gap-ATR Strategy');
    }
    
    // Test backtest configuration
    console.log('\n🧪 STEP 4: Testing backtest configuration...');
    
    const backtestConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: startDate,
      endDate: endDate,
      initialBalance: 100000,
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
    console.log(`  Initial Balance: ₹${backtestConfig.initialBalance.toLocaleString()}`);
    console.log(`  Supertrend: Period=${backtestConfig.strategyConfig.supertrendPeriod}, Multiplier=${backtestConfig.strategyConfig.supertrendMultiplier}`);
    console.log(`  RSI: Entry=${backtestConfig.strategyConfig.rsiEntryLong}/${backtestConfig.strategyConfig.rsiEntryShort}, Exit=${backtestConfig.strategyConfig.rsiExitLong}/${backtestConfig.strategyConfig.rsiExitShort}`);
    console.log(`  ATR Thresholds: Expansion=${backtestConfig.strategyConfig.atrExpansionThreshold}, Decline=${backtestConfig.strategyConfig.atrDeclineThreshold}`);
    
    // Test strategy selection logic
    console.log('\n🔧 STEP 5: Testing strategy selection logic...');
    const strategyConfig = backtestConfig.strategyConfig;
    const useAdvancedATR = strategyConfig.atrDeclineThreshold !== undefined || strategyConfig.atrExpansionThreshold !== undefined;
    console.log(`  atrDeclineThreshold: ${strategyConfig.atrDeclineThreshold}`);
    console.log(`  atrExpansionThreshold: ${strategyConfig.atrExpansionThreshold}`);
    console.log(`  Use Advanced ATR Strategy: ${useAdvancedATR}`);
    
    if (useAdvancedATR) {
      console.log('✅ Will use Advanced ATR Strategy (Supertrend)');
    } else {
      console.log('✅ Will use Standard EMA-Gap-ATR Strategy');
    }
    
    // Test backtest execution
    console.log('\n🔄 STEP 6: Running full backtest...');
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
    
    // Analysis
    console.log('🔍 ROOT CAUSE ANALYSIS:');
    console.log('=======================');
    
    if (results.totalTrades === 0) {
      console.log('❌ ROOT CAUSE: No trades executed');
      console.log('   Possible causes:');
      console.log('   1. Strategy not generating signals');
      console.log('   2. Signals being rejected by backtest orchestrator');
      console.log('   3. Strategy evaluation loop not running');
      console.log('   4. Signal structure mismatch');
    } else {
      console.log('✅ Trades are being executed');
      console.log(`   Total trades: ${results.totalTrades}`);
      console.log(`   Win rate: ${results.winRate.toFixed(2)}%`);
      console.log(`   Total return: ${results.totalReturnPercentage.toFixed(2)}%`);
    }
    
    console.log('\n🎯 Backtest Root Cause Debug Complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugBacktestRootCause();
