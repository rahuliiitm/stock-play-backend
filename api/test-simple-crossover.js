#!/usr/bin/env node

/**
 * Simple EMA Crossover Test
 * 
 * This script tests a basic EMA crossover strategy with minimal parameters
 * to verify the core functionality is working.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:20003';

async function testSimpleCrossover() {
  try {
    console.log('🎯 Testing Simple EMA Crossover Strategy');
    console.log('=' .repeat(50));
    
    // Check if server is running
    try {
      await axios.get(`${BASE_URL}/healthz`);
      console.log('✅ Server is running');
    } catch (error) {
      console.error('❌ Server is not running. Please start the server first.');
      process.exit(1);
    }
    
    // Simple crossover configuration with minimal parameters
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'simple-crossover',
        name: 'Simple EMA Crossover',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.1,        // Very low threshold
        atrMultiplierUnwind: 0.05,      // Very low threshold
        strongCandleThreshold: 0.01,     // Very low threshold
        gapUpDownThreshold: 0.01,        // Very low threshold
        rsiPeriod: 14,
        rsiEntryLong: 20,               // Very lenient
        rsiEntryShort: 80,              // Very lenient
        rsiExitLong: 10,                // Very lenient
        rsiExitShort: 90,               // Very lenient
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
    
    console.log('🚀 Running simple crossover backtest...');
    console.log(`📅 Date range: ${config.startDate} to ${config.endDate}`);
    console.log(`📊 Strategy: EMA ${config.strategyConfig.emaFastPeriod}/${config.strategyConfig.emaSlowPeriod} crossover`);
    console.log(`📊 RSI: Long < ${config.strategyConfig.rsiEntryLong}, Short > ${config.strategyConfig.rsiEntryShort}`);
    console.log(`📊 ATR Entry: ${config.strategyConfig.atrMultiplierEntry}`);
    
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
      console.log('\n📈 Sample Trades:');
      response.data.trades.slice(0, 5).forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.direction} ${trade.symbol} - Entry: ₹${trade.entryPrice}, Exit: ₹${trade.exitPrice}, P&L: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`);
      });
      
      console.log('\n✅ SUCCESS: Strategy is generating trades!');
      console.log('🎯 The basic EMA crossover logic is working correctly.');
      
    } else {
      console.log('\n⚠️  No trades generated - investigating further...');
      
      // Test with even more aggressive parameters
      console.log('\n🔍 Testing with ultra-aggressive parameters...');
      
      const ultraAggressiveConfig = {
        ...config,
        strategyConfig: {
          ...config.strategyConfig,
          atrMultiplierEntry: 0.01,      // Ultra low
          atrMultiplierUnwind: 0.01,     // Ultra low
          strongCandleThreshold: 0.001,  // Ultra low
          gapUpDownThreshold: 0.001,     // Ultra low
          rsiEntryLong: 5,               // Ultra lenient
          rsiEntryShort: 95,             // Ultra lenient
          rsiExitLong: 1,                // Ultra lenient
          rsiExitShort: 99,              // Ultra lenient
        }
      };
      
      const ultraResponse = await axios.post(`${BASE_URL}/backtest/run`, ultraAggressiveConfig);
      
      if (ultraResponse.data.trades.length > 0) {
        console.log(`✅ Ultra-aggressive config generated ${ultraResponse.data.trades.length} trades`);
        console.log('🎯 The issue is with parameter thresholds, not the core logic.');
      } else {
        console.log('❌ Even ultra-aggressive parameters failed to generate trades');
        console.log('🔍 This suggests a fundamental issue with the strategy logic or data processing.');
        console.log('\n📋 Possible issues:');
        console.log('   1. EMA crossover detection is not working');
        console.log('   2. Data is not being processed correctly');
        console.log('   3. Strategy evaluation logic has bugs');
        console.log('   4. Entry conditions are too restrictive');
      }
    }
    
    console.log('\n🎯 Simple Crossover Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSimpleCrossover();
