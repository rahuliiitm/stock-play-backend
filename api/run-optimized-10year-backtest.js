const axios = require('axios');

/**
 * Optimized 10-year NIFTY backtest with chunked processing
 */
async function runOptimized10YearBacktest() {
  console.log('🚀 Starting optimized 10-year NIFTY backtest...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test configurations for different time periods (smaller chunks)
  const testConfigs = [
    {
      name: '2015-2017 (Early Period)',
      description: 'First 3 years of data',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2015-01-09T00:00:00.000Z'),
        endDate: new Date('2017-12-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: 'early-period',
          name: 'Early Period Strategy',
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
      name: '2018-2020 (Mid Period)',
      description: 'Middle 3 years including COVID',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2018-01-01T00:00:00.000Z'),
        endDate: new Date('2020-12-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: 'mid-period',
          name: 'Mid Period Strategy',
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
      name: '2021-2023 (Recent Period)',
      description: 'Recent 3 years post-COVID',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2021-01-01T00:00:00.000Z'),
        endDate: new Date('2023-12-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: 'recent-period',
          name: 'Recent Period Strategy',
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
      name: '2024-2025 (Latest Period)',
      description: 'Most recent 2 years',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2025-07-25T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: 'latest-period',
          name: 'Latest Period Strategy',
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
    }
  ];
  
  const results = [];
  
  for (const test of testConfigs) {
    console.log(`\n🧪 Running test: ${test.name}`);
    console.log(`📝 ${test.description}`);
    
    try {
      console.log('📤 Sending backtest request...');
      const startTime = Date.now();
      
      const response = await axios.post(`${baseUrl}/backtest/run`, test.config, {
        timeout: 120000 // 2 minutes timeout
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Backtest completed in ${duration.toFixed(2)}s`);
      
      const result = {
        name: test.name,
        description: test.description,
        duration: duration,
        totalTrades: response.data.totalTrades || 0,
        totalReturn: response.data.totalReturnPercentage || 0,
        finalBalance: response.data.finalBalance || 0,
        winRate: response.data.winRate || 0,
        maxDrawdown: response.data.maxDrawdown || 0,
        sharpeRatio: response.data.sharpeRatio || 0,
        startDate: test.config.startDate,
        endDate: test.config.endDate,
        config: test.config.strategyConfig
      };
      
      results.push(result);
      
      console.log(`📊 Results:`);
      console.log(`   💰 Total Trades: ${result.totalTrades}`);
      console.log(`   📈 Total Return: ${result.totalReturn.toFixed(2)}%`);
      console.log(`   💵 Final Balance: ₹${result.finalBalance.toLocaleString()}`);
      console.log(`   🎯 Win Rate: ${result.winRate.toFixed(2)}%`);
      console.log(`   📉 Max Drawdown: ${result.maxDrawdown.toFixed(2)}%`);
      console.log(`   📊 Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`);
      
    } catch (error) {
      console.error(`❌ Error in ${test.name}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      
      results.push({
        name: test.name,
        description: test.description,
        error: error.message,
        totalTrades: 0,
        totalReturn: 0,
        finalBalance: 0,
        winRate: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      });
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(80));
  console.log('📊 10-YEAR BACKTEST SUMMARY REPORT (CHUNKED ANALYSIS)');
  console.log('='.repeat(80));
  
  console.log('\n🏆 PERFORMANCE BY TIME PERIOD:');
  console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Time Period                     │ Trades   │ Return   │ Win Rate │ Drawdown │ Sharpe   │');
  console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
  
  results.forEach(result => {
    const name = result.name.padEnd(31);
    const trades = (result.totalTrades || 0).toString().padStart(8);
    const returnPct = (result.totalReturn || 0).toFixed(1).padStart(8);
    const winRate = (result.winRate || 0).toFixed(1).padStart(8);
    const drawdown = (result.maxDrawdown || 0).toFixed(1).padStart(8);
    const sharpe = (result.sharpeRatio || 0).toFixed(2).padStart(8);
    
    console.log(`│ ${name} │ ${trades} │ ${returnPct}% │ ${winRate}% │ ${drawdown}% │ ${sharpe} │`);
  });
  
  console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
  
  // Calculate overall performance
  const totalTrades = results.reduce((sum, r) => sum + (r.totalTrades || 0), 0);
  const totalReturn = results.reduce((sum, r) => sum + (r.totalReturn || 0), 0);
  const avgWinRate = results.reduce((sum, r) => sum + (r.winRate || 0), 0) / results.length;
  const maxDrawdown = Math.max(...results.map(r => r.maxDrawdown || 0));
  const avgSharpe = results.reduce((sum, r) => sum + (r.sharpeRatio || 0), 0) / results.length;
  
  console.log('\n📈 OVERALL PERFORMANCE SUMMARY:');
  console.log(`   💰 Total Trades: ${totalTrades}`);
  console.log(`   📈 Total Return: ${totalReturn.toFixed(2)}%`);
  console.log(`   🎯 Average Win Rate: ${avgWinRate.toFixed(2)}%`);
  console.log(`   📉 Maximum Drawdown: ${maxDrawdown.toFixed(2)}%`);
  console.log(`   📊 Average Sharpe Ratio: ${avgSharpe.toFixed(2)}`);
  
  // Find best performing period
  const bestPeriod = results.reduce((best, current) => {
    if (current.totalReturn > best.totalReturn) {
      return current;
    }
    return best;
  }, results[0]);
  
  console.log(`\n🏆 BEST PERFORMING PERIOD: ${bestPeriod.name}`);
  console.log(`   📈 Total Return: ${bestPeriod.totalReturn.toFixed(2)}%`);
  console.log(`   💰 Final Balance: ₹${bestPeriod.finalBalance.toLocaleString()}`);
  console.log(`   🎯 Win Rate: ${bestPeriod.winRate.toFixed(2)}%`);
  console.log(`   📊 Sharpe Ratio: ${bestPeriod.sharpeRatio.toFixed(2)}`);
  
  // Market condition analysis
  console.log('\n📊 MARKET CONDITION ANALYSIS:');
  console.log('   📈 2015-2017: Early market conditions');
  console.log('   📉 2018-2020: Mid period including COVID crash');
  console.log('   📈 2021-2023: Post-COVID recovery');
  console.log('   📊 2024-2025: Recent market conditions');
  
  console.log('\n🎉 10-year chunked backtest analysis completed!');
  
  return results;
}

// Run the optimized backtest
runOptimized10YearBacktest().catch(error => {
  console.error('❌ Backtest failed:', error);
});
