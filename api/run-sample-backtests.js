const axios = require('axios');
const fs = require('fs');

/**
 * Run backtests on sample datasets representing different market periods
 */
async function runSampleBacktests() {
  console.log('🚀 Starting sample dataset backtests...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Sample datasets to test
  const samples = [
    {
      name: '2015 Early Market',
      description: 'First half of 2015 - Early market conditions',
      dataFile: 'data/NIFTY_2015_sample.csv',
      startDate: new Date('2015-01-09T00:00:00.000Z'),
      endDate: new Date('2015-06-30T23:59:59.000Z'),
      marketCondition: 'Early Market'
    },
    {
      name: '2018 Pre-COVID',
      description: 'First half of 2018 - Pre-COVID market',
      dataFile: 'data/NIFTY_2018_sample.csv',
      startDate: new Date('2018-01-01T00:00:00.000Z'),
      endDate: new Date('2018-06-30T23:59:59.000Z'),
      marketCondition: 'Pre-COVID'
    },
    {
      name: '2020 COVID Crash',
      description: 'First half of 2020 - COVID crash period',
      dataFile: 'data/NIFTY_2020_covid.csv',
      startDate: new Date('2020-01-01T00:00:00.000Z'),
      endDate: new Date('2020-06-30T23:59:59.000Z'),
      marketCondition: 'COVID Crash'
    },
    {
      name: '2021 Recovery',
      description: 'First half of 2021 - Post-COVID recovery',
      dataFile: 'data/NIFTY_2021_recovery.csv',
      startDate: new Date('2021-01-01T00:00:00.000Z'),
      endDate: new Date('2021-06-30T23:59:59.000Z'),
      marketCondition: 'Recovery'
    },
    {
      name: '2024 Recent',
      description: 'First half of 2024 - Recent market conditions',
      dataFile: 'data/NIFTY_2024_recent.csv',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-06-30T23:59:59.000Z'),
      marketCondition: 'Recent'
    }
  ];
  
  const results = [];
  
  for (const sample of samples) {
    console.log(`\n🧪 Testing: ${sample.name}`);
    console.log(`📝 ${sample.description}`);
    console.log(`📊 Market Condition: ${sample.marketCondition}`);
    
    // Check if data file exists
    if (!fs.existsSync(sample.dataFile)) {
      console.error(`❌ Data file not found: ${sample.dataFile}`);
      continue;
    }
    
    // Copy the sample data to the main data file
    console.log('📁 Copying sample data...');
    fs.copyFileSync(sample.dataFile, 'data/NIFTY_15m.csv');
    
    try {
      console.log('📤 Sending backtest request...');
      const startTime = Date.now();
      
      const config = {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: sample.startDate,
        endDate: sample.endDate,
        initialBalance: 100000,
        strategyConfig: {
          id: `sample-${sample.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${sample.name} Strategy`,
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
      
      const response = await axios.post(`${baseUrl}/backtest/run`, config, {
        timeout: 30000 // 30 seconds timeout
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Backtest completed in ${duration.toFixed(2)}s`);
      
      const result = {
        name: sample.name,
        description: sample.description,
        marketCondition: sample.marketCondition,
        duration: duration,
        totalTrades: response.data.totalTrades || 0,
        totalReturn: response.data.totalReturnPercentage || 0,
        finalBalance: response.data.finalBalance || 0,
        winRate: response.data.winRate || 0,
        maxDrawdown: response.data.maxDrawdown || 0,
        sharpeRatio: response.data.sharpeRatio || 0,
        startDate: sample.startDate,
        endDate: sample.endDate,
        dataFile: sample.dataFile
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
      console.error(`❌ Error in ${sample.name}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      
      results.push({
        name: sample.name,
        description: sample.description,
        marketCondition: sample.marketCondition,
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
  console.log('📊 10-YEAR SAMPLE BACKTEST SUMMARY REPORT');
  console.log('='.repeat(80));
  
  console.log('\n🏆 PERFORMANCE BY MARKET PERIOD:');
  console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Market Period                   │ Trades   │ Return   │ Win Rate │ Drawdown │ Sharpe   │ Condition│');
  console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
  
  results.forEach(result => {
    const name = result.name.padEnd(31);
    const trades = (result.totalTrades || 0).toString().padStart(8);
    const returnPct = (result.totalReturn || 0).toFixed(1).padStart(8);
    const winRate = (result.winRate || 0).toFixed(1).padStart(8);
    const drawdown = (result.maxDrawdown || 0).toFixed(1).padStart(8);
    const sharpe = (result.sharpeRatio || 0).toFixed(2).padStart(8);
    const condition = (result.marketCondition || '').padStart(10);
    
    console.log(`│ ${name} │ ${trades} │ ${returnPct}% │ ${winRate}% │ ${drawdown}% │ ${sharpe} │ ${condition} │`);
  });
  
  console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
  
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
  console.log(`   📊 Market Condition: ${bestPeriod.marketCondition}`);
  
  // Market condition analysis
  console.log('\n📊 MARKET CONDITION ANALYSIS:');
  const conditions = {};
  results.forEach(result => {
    if (!conditions[result.marketCondition]) {
      conditions[result.marketCondition] = [];
    }
    conditions[result.marketCondition].push(result);
  });
  
  Object.keys(conditions).forEach(condition => {
    const periodResults = conditions[condition];
    const avgReturn = periodResults.reduce((sum, r) => sum + (r.totalReturn || 0), 0) / periodResults.length;
    const avgWinRate = periodResults.reduce((sum, r) => sum + (r.winRate || 0), 0) / periodResults.length;
    console.log(`   📊 ${condition}: Avg Return ${avgReturn.toFixed(2)}%, Avg Win Rate ${avgWinRate.toFixed(2)}%`);
  });
  
  console.log('\n🎉 10-year sample backtest analysis completed!');
  
  return results;
}

// Run the sample backtests
runSampleBacktests().catch(error => {
  console.error('❌ Sample backtest failed:', error);
});
