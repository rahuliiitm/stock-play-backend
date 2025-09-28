const axios = require('axios');

/**
 * Quick 10-year NIFTY backtest with very small time periods
 */
async function runQuick10YearBacktest() {
  console.log('🚀 Starting quick 10-year NIFTY backtest...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test configurations for very small time periods
  const testConfigs = [
    {
      name: '2015 Q1 (3 months)',
      description: 'First quarter of 2015',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2015-01-09T00:00:00.000Z'),
        endDate: new Date('2015-03-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '2015-q1',
          name: '2015 Q1 Strategy',
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
      name: '2018 Q1 (3 months)',
      description: 'First quarter of 2018',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2018-01-01T00:00:00.000Z'),
        endDate: new Date('2018-03-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '2018-q1',
          name: '2018 Q1 Strategy',
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
      name: '2020 Q1 (COVID)',
      description: 'COVID crash period',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
        endDate: new Date('2020-03-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '2020-q1-covid',
          name: '2020 Q1 COVID Strategy',
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
      name: '2021 Q1 (Recovery)',
      description: 'Post-COVID recovery',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2021-01-01T00:00:00.000Z'),
        endDate: new Date('2021-03-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '2021-q1-recovery',
          name: '2021 Q1 Recovery Strategy',
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
      name: '2024 Q1 (Recent)',
      description: 'Most recent quarter',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-03-31T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '2024-q1-recent',
          name: '2024 Q1 Recent Strategy',
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
        timeout: 60000 // 1 minute timeout
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
  console.log('📊 10-YEAR BACKTEST SUMMARY REPORT (QUARTERLY ANALYSIS)');
  console.log('='.repeat(80));
  
  console.log('\n🏆 PERFORMANCE BY QUARTER:');
  console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Quarter                        │ Trades   │ Return   │ Win Rate │ Drawdown │ Sharpe   │');
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
  
  // Find best performing quarter
  const bestQuarter = results.reduce((best, current) => {
    if (current.totalReturn > best.totalReturn) {
      return current;
    }
    return best;
  }, results[0]);
  
  console.log(`\n🏆 BEST PERFORMING QUARTER: ${bestQuarter.name}`);
  console.log(`   📈 Total Return: ${bestQuarter.totalReturn.toFixed(2)}%`);
  console.log(`   💰 Final Balance: ₹${bestQuarter.finalBalance.toLocaleString()}`);
  console.log(`   🎯 Win Rate: ${bestQuarter.winRate.toFixed(2)}%`);
  console.log(`   📊 Sharpe Ratio: ${bestQuarter.sharpeRatio.toFixed(2)}`);
  
  // Market condition analysis
  console.log('\n📊 MARKET CONDITION ANALYSIS:');
  console.log('   📈 2015 Q1: Early market conditions');
  console.log('   📊 2018 Q1: Pre-COVID market');
  console.log('   📉 2020 Q1: COVID crash period');
  console.log('   📈 2021 Q1: Post-COVID recovery');
  console.log('   📊 2024 Q1: Recent market conditions');
  
  console.log('\n🎉 10-year quarterly backtest analysis completed!');
  
  return results;
}

// Run the quick backtest
runQuick10YearBacktest().catch(error => {
  console.error('❌ Backtest failed:', error);
});
