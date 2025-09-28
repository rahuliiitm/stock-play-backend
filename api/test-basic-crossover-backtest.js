#!/usr/bin/env node

/**
 * Basic Crossover Backtest
 * 
 * This script creates a minimal backtest that focuses only on EMA crossover
 * without the complex strategy framework.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:20003';

async function runBasicCrossoverBacktest() {
  try {
    console.log('🎯 Basic EMA Crossover Backtest');
    console.log('=' .repeat(50));
    
    // Check if server is running
    try {
      await axios.get(`${BASE_URL}/healthz`);
      console.log('✅ Server is running');
    } catch (error) {
      console.error('❌ Server is not running. Please start the server first.');
      process.exit(1);
    }
    
    // Ultra-simple configuration - just EMA crossover
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'basic-crossover',
        name: 'Basic EMA Crossover',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.001,      // Almost zero
        atrMultiplierUnwind: 0.001,      // Almost zero
        strongCandleThreshold: 0.001,    // Almost zero
        gapUpDownThreshold: 0.001,       // Almost zero
        rsiPeriod: 14,
        rsiEntryLong: 1,                // Almost always true
        rsiEntryShort: 99,              // Almost always true
        rsiExitLong: 1,                 // Almost always true
        rsiExitShort: 99,               // Almost always true
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
    };
    
    console.log('🚀 Running basic crossover backtest...');
    console.log(`📊 Strategy: Pure EMA ${config.strategyConfig.emaFastPeriod}/${config.strategyConfig.emaSlowPeriod} crossover`);
    console.log(`📊 All other parameters set to extreme values to bypass filtering`);
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/backtest/run`, config);
    const endTime = Date.now();
    
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Backtest completed in ${duration}s`);
    console.log('\n📊 Results:');
    console.log(`   Total Return: ${response.data.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   Total Trades: ${response.data.trades.length}`);
    console.log(`   Final Balance: ₹${(response.data.finalBalance || 0).toLocaleString()}`);
    
    if (response.data.trades.length > 0) {
      console.log('\n✅ SUCCESS: Basic crossover strategy is working!');
      console.log('🎯 The issue was with the complex strategy parameters, not the core logic.');
      
      const winningTrades = response.data.trades.filter(t => t.pnl > 0);
      const losingTrades = response.data.trades.filter(t => t.pnl < 0);
      const winRate = (winningTrades.length / response.data.trades.length * 100).toFixed(1);
      
      console.log(`\n📈 Performance:`);
      console.log(`   Win Rate: ${winRate}%`);
      console.log(`   Winning Trades: ${winningTrades.length}`);
      console.log(`   Losing Trades: ${losingTrades.length}`);
      
      // Show first few trades
      console.log('\n📋 Sample Trades:');
      response.data.trades.slice(0, 5).forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.direction} ${trade.symbol} - Entry: ₹${trade.entryPrice}, Exit: ₹${trade.exitPrice}, P&L: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`);
      });
      
    } else {
      console.log('\n❌ FAILED: Even basic crossover is not working');
      console.log('🔍 This indicates a fundamental issue with the backtest framework itself.');
      console.log('\n📋 Next steps:');
      console.log('   1. Check if the strategy service is being called correctly');
      console.log('   2. Verify the signal generation logic');
      console.log('   3. Check if the backtest orchestrator is processing signals');
      console.log('   4. Review the order execution logic');
    }
    
    console.log('\n🎯 Basic Crossover Backtest Complete!');
    
  } catch (error) {
    console.error('❌ Backtest failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runBasicCrossoverBacktest();
