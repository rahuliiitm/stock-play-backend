#!/usr/bin/env node

/**
 * Debug Supertrend Strategy
 * 
 * This script debugs the Supertrend strategy to see what's happening
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATA_PROVIDER_MODE = 'csv';
process.env.CSV_DATA_DIR = path.join(__dirname, 'data');

console.log('🔍 DEBUG SUPERTREND STRATEGY');
console.log('============================\n');

async function debugSupertrendStrategy() {
  try {
    // Import the strategy service directly
    const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
    const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
    
    // Initialize services
    const dataProvider = new CsvDataProvider();
    const strategyService = new AdvancedATRStrategyService();
    
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
    
    // Test strategy configuration
    const strategyConfig = {
      id: 'supertrend-rsi-debug',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
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
    
    console.log('🔧 Testing strategy evaluation...');
    
    // Test with first 100 candles
    const testCandles = candles.slice(0, 100);
    console.log(`🧪 Testing with ${testCandles.length} candles`);
    
    const evaluation = await strategyService.evaluate(strategyConfig, testCandles);
    console.log(`📊 Strategy evaluation result:`);
    console.log(`  Signals: ${evaluation.signals.length}`);
    console.log(`  Debug: ${JSON.stringify(evaluation.debug, null, 2)}`);
    
    if (evaluation.signals.length > 0) {
      console.log('✅ Strategy is generating signals!');
      evaluation.signals.forEach((signal, index) => {
        console.log(`  Signal ${index + 1}: ${signal.type} ${signal.direction} at ${signal.data?.price}`);
      });
    } else {
      console.log('⚠️  No signals generated - strategy might be too conservative');
    }
    
    // Test with more candles
    console.log('\n🔧 Testing with more candles...');
    const moreCandles = candles.slice(0, 500);
    console.log(`🧪 Testing with ${moreCandles.length} candles`);
    
    const evaluation2 = await strategyService.evaluate(strategyConfig, moreCandles);
    console.log(`📊 Strategy evaluation result:`);
    console.log(`  Signals: ${evaluation2.signals.length}`);
    
    if (evaluation2.signals.length > 0) {
      console.log('✅ Strategy is generating signals with more data!');
      evaluation2.signals.forEach((signal, index) => {
        console.log(`  Signal ${index + 1}: ${signal.type} ${signal.direction} at ${signal.data?.price}`);
      });
    } else {
      console.log('⚠️  Still no signals - checking strategy logic...');
      
      // Check if the issue is with the strategy logic
      console.log('\n🔍 Debugging strategy logic...');
      
      // Test with different RSI thresholds
      const relaxedConfig = { ...strategyConfig };
      relaxedConfig.rsiEntryLong = 40;  // More relaxed entry
      relaxedConfig.rsiEntryShort = 60;
      relaxedConfig.rsiExitLong = 80;   // More relaxed exit
      relaxedConfig.rsiExitShort = 20;
      
      console.log('🧪 Testing with relaxed RSI thresholds...');
      const evaluation3 = await strategyService.evaluate(relaxedConfig, moreCandles);
      console.log(`📊 Relaxed strategy evaluation result:`);
      console.log(`  Signals: ${evaluation3.signals.length}`);
      
      if (evaluation3.signals.length > 0) {
        console.log('✅ Strategy works with relaxed RSI thresholds!');
        evaluation3.signals.forEach((signal, index) => {
          console.log(`  Signal ${index + 1}: ${signal.type} ${signal.direction} at ${signal.data?.price}`);
        });
      } else {
        console.log('❌ Still no signals - there might be an issue with the strategy implementation');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugSupertrendStrategy();


