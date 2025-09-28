#!/usr/bin/env node

/**
 * Strategy Performance Analysis
 * 
 * This script analyzes why the EMA-Gap-ATR strategy is not generating trades
 * with the large dataset and provides recommendations for parameter adjustment.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:20003';

// Test different parameter configurations
const testConfigs = [
  {
    name: 'Current Configuration',
    description: 'Default parameters that are not generating trades',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'current',
        name: 'Current Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.6,
        atrMultiplierUnwind: 0.3,
        strongCandleThreshold: 0.1,
        gapUpDownThreshold: 0.3,
        rsiPeriod: 14,
        rsiEntryLong: 48,
        rsiEntryShort: 52,
        rsiExitLong: 45,
        rsiExitShort: 55,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  },
  {
    name: 'Relaxed Parameters',
    description: 'More lenient entry conditions',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'relaxed',
        name: 'Relaxed Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.3,        // Lower threshold
        atrMultiplierUnwind: 0.2,        // Lower threshold
        strongCandleThreshold: 0.05,     // Lower threshold
        gapUpDownThreshold: 0.1,        // Lower threshold
        rsiPeriod: 14,
        rsiEntryLong: 40,               // More lenient
        rsiEntryShort: 60,              // More lenient
        rsiExitLong: 35,                // More lenient
        rsiExitShort: 65,               // More lenient
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  },
  {
    name: 'Aggressive Parameters',
    description: 'Very aggressive entry conditions',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'aggressive',
        name: 'Aggressive Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.1,         // Very low threshold
        atrMultiplierUnwind: 0.05,      // Very low threshold
        strongCandleThreshold: 0.01,    // Very low threshold
        gapUpDownThreshold: 0.05,       // Very low threshold
        rsiPeriod: 14,
        rsiEntryLong: 30,               // Very lenient
        rsiEntryShort: 70,              // Very lenient
        rsiExitLong: 25,                // Very lenient
        rsiExitShort: 75,               // Very lenient
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  },
  {
    name: 'Shorter Timeframe Test',
    description: 'Test with a shorter time period to see if strategy works',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2025-07-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'short-period',
        name: 'Short Period Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.3,
        atrMultiplierUnwind: 0.2,
        strongCandleThreshold: 0.05,
        gapUpDownThreshold: 0.1,
        rsiPeriod: 14,
        rsiEntryLong: 40,
        rsiEntryShort: 60,
        rsiExitLong: 35,
        rsiExitShort: 65,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  }
];

async function runBacktest(config) {
  try {
    console.log(`\n🚀 Testing ${config.name}...`);
    console.log(`📝 ${config.description}`);
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/backtest/run`, config.config);
    const endTime = Date.now();
    
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ ${config.name} completed in ${duration}s`);
    console.log(`📊 Results:`);
    console.log(`   Total Return: ${response.data.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   Total Trades: ${response.data.trades.length}`);
    console.log(`   Final Balance: ₹${(response.data.finalBalance || 0).toLocaleString()}`);
    
    if (response.data.trades.length > 0) {
      const winningTrades = response.data.trades.filter(t => t.pnl > 0);
      const losingTrades = response.data.trades.filter(t => t.pnl < 0);
      const winRate = (winningTrades.length / response.data.trades.length * 100).toFixed(1);
      
      console.log(`   Win Rate: ${winRate}%`);
      console.log(`   Winning Trades: ${winningTrades.length}`);
      console.log(`   Losing Trades: ${losingTrades.length}`);
      
      if (winningTrades.length > 0) {
        const avgWin = (winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length).toFixed(2);
        console.log(`   Average Win: ₹${avgWin}`);
      }
      
      if (losingTrades.length > 0) {
        const avgLoss = (losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length).toFixed(2);
        console.log(`   Average Loss: ₹${avgLoss}`);
      }
      
      // Show first few trades
      console.log(`\n📈 Sample Trades:`);
      response.data.trades.slice(0, 3).forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.direction} ${trade.symbol} - Entry: ₹${trade.entryPrice}, Exit: ₹${trade.exitPrice}, P&L: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`);
      });
    } else {
      console.log(`⚠️  No trades generated with ${config.name}`);
    }
    
    return {
      name: config.name,
      duration: parseFloat(duration),
      results: response.data,
      success: response.data.trades.length > 0
    };
    
  } catch (error) {
    console.error(`❌ ${config.name} failed:`, error.response?.data?.message || error.message);
    return {
      name: config.name,
      error: error.response?.data?.message || error.message,
      success: false
    };
  }
}

async function main() {
  try {
    console.log('🔍 EMA-Gap-ATR Strategy Performance Analysis');
    console.log('=' .repeat(60));
    
    // Check if server is running
    try {
      await axios.get(`${BASE_URL}/healthz`);
      console.log('✅ Server is running');
    } catch (error) {
      console.error('❌ Server is not running. Please start the server first.');
      process.exit(1);
    }
    
    const results = [];
    
    // Test each configuration
    for (const config of testConfigs) {
      const result = await runBacktest(config);
      results.push(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analysis
    console.log('\n📊 ANALYSIS RESULTS');
    console.log('=' .repeat(60));
    
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    console.log(`✅ Configurations with trades: ${successfulResults.length}`);
    console.log(`❌ Configurations without trades: ${failedResults.length}`);
    
    if (successfulResults.length > 0) {
      console.log('\n🏆 Successful Configurations:');
      successfulResults.forEach(result => {
        console.log(`   ${result.name}: ${result.results.trades.length} trades, ${result.results.totalReturnPercentage.toFixed(2)}% return`);
      });
    }
    
    if (failedResults.length > 0) {
      console.log('\n⚠️  Configurations without trades:');
      failedResults.forEach(result => {
        console.log(`   ${result.name}: ${result.error || 'No trades generated'}`);
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    if (successfulResults.length === 0) {
      console.log('🔍 All configurations failed to generate trades. Possible issues:');
      console.log('   1. Strategy parameters are too restrictive');
      console.log('   2. Market conditions don\'t meet entry criteria');
      console.log('   3. Data quality issues');
      console.log('   4. Strategy logic needs adjustment');
      console.log('\n📋 Suggested actions:');
      console.log('   • Further relax entry parameters (atrMultiplierEntry < 0.3)');
      console.log('   • Lower RSI thresholds (rsiEntryLong < 40, rsiEntryShort > 60)');
      console.log('   • Reduce strongCandleThreshold (< 0.05)');
      console.log('   • Check if EMA crossovers are occurring in the dataset');
      console.log('   • Verify indicator calculations are working correctly');
    } else {
      console.log('✅ Strategy is working with some configurations!');
      console.log('📈 Recommended parameters based on successful tests:');
      
      const bestResult = successfulResults.reduce((best, current) => 
        current.results.trades.length > best.results.trades.length ? current : best
      );
      
      console.log(`   Best performing: ${bestResult.name}`);
      console.log(`   Trades generated: ${bestResult.results.trades.length}`);
      console.log(`   Return: ${bestResult.results.totalReturnPercentage.toFixed(2)}%`);
    }
    
    console.log('\n🎯 Analysis Complete!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

main();
