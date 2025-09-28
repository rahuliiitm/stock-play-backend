#!/usr/bin/env node

/**
 * Comprehensive Backtest Runner
 * 
 * This script runs multiple backtests with different configurations
 * to evaluate the EMA-Gap-ATR strategy performance across various
 * market conditions and parameter sets.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:20003';

// Test configurations for comprehensive evaluation
const testConfigs = [
  {
    name: 'Conservative Strategy',
    description: 'Lower risk, higher thresholds',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'conservative',
        name: 'Conservative EMA-Gap-ATR',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.8,        // Higher threshold
        atrMultiplierUnwind: 0.4,       // Higher threshold
        strongCandleThreshold: 0.3,      // Higher threshold
        gapUpDownThreshold: 0.5,         // Higher threshold
        rsiPeriod: 14,
        rsiEntryLong: 50,               // More conservative
        rsiEntryShort: 50,              // More conservative
        rsiExitLong: 40,                // More conservative
        rsiExitShort: 60,               // More conservative
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.03,               // Lower max loss
        positionSize: 1,
        maxLots: 3,                     // Lower max lots
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  },
  {
    name: 'Aggressive Strategy',
    description: 'Higher risk, lower thresholds',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'aggressive',
        name: 'Aggressive EMA-Gap-ATR',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.4,        // Lower threshold
        atrMultiplierUnwind: 0.2,       // Lower threshold
        strongCandleThreshold: 0.05,    // Lower threshold
        gapUpDownThreshold: 0.2,        // Lower threshold
        rsiPeriod: 14,
        rsiEntryLong: 45,               // Less conservative
        rsiEntryShort: 55,              // Less conservative
        rsiExitLong: 40,                // Less conservative
        rsiExitShort: 60,               // Less conservative
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.08,               // Higher max loss
        positionSize: 2,                // Larger position size
        maxLots: 8,                     // Higher max lots
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  },
  {
    name: 'Balanced Strategy',
    description: 'Moderate risk, balanced parameters',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'balanced',
        name: 'Balanced EMA-Gap-ATR',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.6,        // Moderate threshold
        atrMultiplierUnwind: 0.3,       // Moderate threshold
        strongCandleThreshold: 0.1,    // Moderate threshold
        gapUpDownThreshold: 0.3,        // Moderate threshold
        rsiPeriod: 14,
        rsiEntryLong: 48,               // Moderate
        rsiEntryShort: 52,              // Moderate
        rsiExitLong: 45,                // Moderate
        rsiExitShort: 55,               // Moderate
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,               // Moderate max loss
        positionSize: 1,                // Standard position size
        maxLots: 5,                     // Moderate max lots
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  },
  {
    name: 'Trend Following Strategy',
    description: 'Optimized for trend following',
    config: {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'trend-following',
        name: 'Trend Following EMA-Gap-ATR',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 12,              // Slightly slower
        emaSlowPeriod: 26,              // Slightly slower
        atrPeriod: 14,
        atrMultiplierEntry: 0.7,        // Higher for trends
        atrMultiplierUnwind: 0.35,      // Higher for trends
        strongCandleThreshold: 0.15,    // Moderate
        gapUpDownThreshold: 0.4,        // Higher for trends
        rsiPeriod: 14,
        rsiEntryLong: 45,               // More aggressive for trends
        rsiEntryShort: 55,              // More aggressive for trends
        rsiExitLong: 35,                // More aggressive exits
        rsiExitShort: 65,               // More aggressive exits
        slopeLookback: 5,               // Longer slope lookback
        capital: 100000,
        maxLossPct: 0.06,               // Moderate max loss
        positionSize: 1,
        maxLots: 6,                     // Higher for trends
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    }
  }
];

// Time period tests
const timePeriodTests = [
  {
    name: 'Q4 2024 (Oct-Dec)',
    startDate: '2024-10-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z'
  },
  {
    name: 'Q1 2025 (Jan-Mar)',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-03-31T23:59:59.000Z'
  },
  {
    name: 'Q2 2025 (Apr-Jun)',
    startDate: '2025-04-01T00:00:00.000Z',
    endDate: '2025-06-30T23:59:59.000Z'
  },
  {
    name: 'Q3 2025 (Jul-Sep)',
    startDate: '2025-07-01T00:00:00.000Z',
    endDate: '2025-07-25T23:59:59.000Z'
  }
];

async function runBacktest(config) {
  try {
    console.log(`\n🚀 Running ${config.name}...`);
    console.log(`📝 ${config.description}`);
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/backtest/run`, config.config);
    const endTime = Date.now();
    
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ ${config.name} completed in ${duration}s`);
    console.log(`📊 Results:`);
    console.log(`   Total Return: ${response.data.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   Total Trades: ${response.data.trades.length}`);
    console.log(`   Final Balance: ₹${response.data.finalBalance.toLocaleString()}`);
    
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
    }
    
    return {
      name: config.name,
      duration: parseFloat(duration),
      results: response.data
    };
    
  } catch (error) {
    console.error(`❌ ${config.name} failed:`, error.response?.data?.message || error.message);
    return {
      name: config.name,
      error: error.response?.data?.message || error.message
    };
  }
}

async function runTimePeriodTest(baseConfig, timePeriod) {
  const config = {
    ...baseConfig,
    config: {
      ...baseConfig.config,
      startDate: timePeriod.startDate,
      endDate: timePeriod.endDate
    }
  };
  
  config.name = `${baseConfig.name} - ${timePeriod.name}`;
  config.description = `${baseConfig.description} (${timePeriod.name})`;
  
  return await runBacktest(config);
}

async function main() {
  console.log('🎯 EMA-Gap-ATR Strategy Comprehensive Backtesting');
  console.log('=' .repeat(60));
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/healthz`);
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('Run: cd /Users/rjain/stockplay/stock-play-backend/api && npm start');
    process.exit(1);
  }
  
  const results = [];
  
  // Run strategy configuration tests
  console.log('\n📈 Running Strategy Configuration Tests...');
  for (const config of testConfigs) {
    const result = await runBacktest(config);
    results.push(result);
    
    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Run time period tests with balanced strategy
  console.log('\n📅 Running Time Period Tests...');
  const balancedConfig = testConfigs.find(c => c.name === 'Balanced Strategy');
  
  for (const timePeriod of timePeriodTests) {
    const result = await runTimePeriodTest(balancedConfig, timePeriod);
    results.push(result);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 COMPREHENSIVE BACKTEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successfulResults = results.filter(r => !r.error);
  const failedResults = results.filter(r => r.error);
  
  console.log(`✅ Successful Tests: ${successfulResults.length}`);
  console.log(`❌ Failed Tests: ${failedResults.length}`);
  
  if (successfulResults.length > 0) {
    console.log('\n🏆 Best Performing Strategies:');
    const sortedResults = successfulResults
      .filter(r => r.results && r.results.totalReturnPercentage !== undefined)
      .sort((a, b) => b.results.totalReturnPercentage - a.results.totalReturnPercentage);
    
    sortedResults.slice(0, 3).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.name}: ${result.results.totalReturnPercentage.toFixed(2)}%`);
    });
    
    console.log('\n📈 Strategy Performance Analysis:');
    successfulResults.forEach(result => {
      if (result.results) {
        console.log(`\n${result.name}:`);
        console.log(`   Return: ${result.results.totalReturnPercentage.toFixed(2)}%`);
        console.log(`   Trades: ${result.results.trades.length}`);
        console.log(`   Duration: ${result.duration}s`);
      }
    });
  }
  
  if (failedResults.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedResults.forEach(result => {
      console.log(`   ${result.name}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 Backtesting Complete!');
}

// Run the comprehensive backtest
main().catch(console.error);
