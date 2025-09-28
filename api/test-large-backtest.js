#!/usr/bin/env node

/**
 * Test Large Dataset Backtest
 * 
 * This script tests the backtest with the large NIFTY dataset
 * to evaluate strategy performance.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:20003';

async function testLargeBacktest() {
  try {
    console.log('🎯 Testing Large Dataset Backtest');
    console.log('=' .repeat(50));
    
    // Check if server is running
    try {
      await axios.get(`${BASE_URL}/healthz`);
      console.log('✅ Server is running');
    } catch (error) {
      console.error('❌ Server is not running. Please start the server first.');
      process.exit(1);
    }
    
    // Test with large dataset configuration
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'large-dataset-test',
        name: 'Large Dataset EMA-Gap-ATR Strategy',
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
    };
    
    console.log('🚀 Running large dataset backtest...');
    console.log(`📅 Date range: ${config.startDate} to ${config.endDate}`);
    
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
    } else {
      console.log('⚠️  No trades generated - strategy may need parameter adjustment');
    }
    
    console.log('\n🎯 Large Dataset Backtest Complete!');
    
  } catch (error) {
    console.error('❌ Backtest failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLargeBacktest();
