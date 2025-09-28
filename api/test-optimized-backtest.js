#!/usr/bin/env node

/**
 * Test Optimized Backtest with ATR Threshold 0.25
 * 
 * This script tests the backtest with the optimal ATR threshold
 * discovered from the crossover analysis.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:20003';

async function testOptimizedBacktest() {
  console.log('🎯 Optimized ATR Threshold Backtest');
  console.log('==================================================');

  try {
    // Check if the server is running
    await axios.get(`${BASE_URL}/healthz`);
    console.log('✅ Server is running');

    console.log('🚀 Running optimized backtest with ATR threshold 0.25...');

    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-10-01T00:00:00.000Z'),
      endDate: new Date('2025-07-25T23:59:59.000Z'),
      initialBalance: 100000,
      strategyConfig: {
        id: 'optimized-crossover',
        name: 'Optimized EMA Crossover Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.25,        // Optimal threshold from analysis
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
        cncExitTime: '15:15',
      },
    };

    console.log('📊 Strategy: EMA 9/21 crossover with ATR threshold 0.25');
    console.log('📊 Expected: Should generate ~54 trades with 87% success rate');

    const response = await axios.post(`${BASE_URL}/backtest/run-nifty`, config);

    console.log(`✅ Backtest completed in ${response.data.durationMs / 1000}s`);
    console.log('\n📊 Results:');
    console.log(`   Total Return: ${response.data.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   Total Trades: ${response.data.totalTrades}`);
    console.log(`   Final Balance: ₹${response.data.finalBalance.toFixed(2)}`);

    if (response.data.totalTrades === 0) {
      console.log('\n❌ FAILED: Still no trades generated');
      console.log('🔍 This indicates a deeper issue with the backtest framework');
      console.log('\n📋 Debugging steps:');
      console.log('   1. Check server logs for errors');
      console.log('   2. Verify data loading in CsvDataProvider');
      console.log('   3. Check strategy evaluation logic');
      console.log('   4. Review signal processing in orchestrator');
    } else {
      console.log('\n✅ SUCCESS: Optimized strategy generated trades!');
      console.log(`   Expected ~54 trades, got ${response.data.totalTrades}`);
      
      if (response.data.totalTrades >= 50 && response.data.totalTrades <= 60) {
        console.log('🎯 PERFECT: Trade count matches analysis prediction!');
      } else {
        console.log('⚠️  WARNING: Trade count differs from analysis prediction');
      }
    }

    // Show detailed results if available
    if (response.data.trades && response.data.trades.length > 0) {
      console.log('\n📈 Sample Trades:');
      response.data.trades.slice(0, 5).forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.type} ${trade.direction} at ₹${trade.entryPrice.toFixed(2)} - PnL: ₹${trade.pnl.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('❌ Backtest failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  } finally {
    console.log('\n🎯 Optimized Backtest Complete!');
  }
}

testOptimizedBacktest();
