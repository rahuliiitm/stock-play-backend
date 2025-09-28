#!/usr/bin/env node

/**
 * Large Dataset Backtest Runner
 * 
 * This script runs comprehensive backtests on the large NIFTY dataset
 * to evaluate strategy performance across different time periods and configurations.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:20003';
const CONFIG_PATH = path.join(__dirname, 'backtest-configs.json');

// Load configurations
const configs = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

async function runBacktest(config) {
  try {
    console.log(`\n🚀 Running ${config.name}...`);
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/backtest/run`, config);
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

async function main() {
  console.log('🎯 Large Dataset EMA-Gap-ATR Strategy Backtesting');
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
  
  // Run full dataset test
  console.log('\n📈 Running Full Dataset Test...');
  const fullResult = await runBacktest(configs.fullDataset);
  results.push(fullResult);
  
  // Run monthly tests
  console.log('\n📅 Running Monthly Tests...');
  for (const month of configs.monthlyTests) {
    const config = {
      ...configs.fullDataset,
      name: `Monthly Test - ${month.name}`,
      startDate: month.startDate,
      endDate: month.endDate
    };
    
    const result = await runBacktest(config);
    results.push(result);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Run quarterly tests
  console.log('\n📊 Running Quarterly Tests...');
  for (const quarter of configs.quarterlyTests) {
    const config = {
      ...configs.fullDataset,
      name: `Quarterly Test - ${quarter.name}`,
      startDate: quarter.startDate,
      endDate: quarter.endDate
    };
    
    const result = await runBacktest(config);
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
    console.log('\n🏆 Best Performing Periods:');
    const sortedResults = successfulResults
      .filter(r => r.results && r.results.totalReturnPercentage !== undefined)
      .sort((a, b) => b.results.totalReturnPercentage - a.results.totalReturnPercentage);
    
    sortedResults.slice(0, 5).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.name}: ${result.results.totalReturnPercentage.toFixed(2)}%`);
    });
  }
  
  console.log('\n🎯 Large Dataset Backtesting Complete!');
}

main().catch(console.error);
