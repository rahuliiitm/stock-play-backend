const axios = require('axios');

/**
 * Comprehensive 10-year NIFTY backtest with multiple configurations
 */
async function run10YearBacktest() {
  console.log('🚀 Starting 10-year NIFTY backtest...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test configurations for different time periods and parameters
  const testConfigs = [
    {
      name: 'Full 10-Year Dataset',
      description: 'Complete 10-year backtest (2015-2025)',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2015-01-09T00:00:00.000Z'),
        endDate: new Date('2025-07-25T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '10year-full',
          name: '10-Year EMA-Gap-ATR Strategy',
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
      name: 'Conservative Parameters',
      description: 'More conservative entry/exit thresholds',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2015-01-09T00:00:00.000Z'),
        endDate: new Date('2025-07-25T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '10year-conservative',
          name: 'Conservative 10-Year Strategy',
          symbol: 'NIFTY',
          timeframe: '15m',
          emaFastPeriod: 9,
          emaSlowPeriod: 21,
          atrPeriod: 14,
          atrMultiplierEntry: 0.8,  // Higher threshold
          atrMultiplierUnwind: 0.2,
          strongCandleThreshold: 0.2,  // Higher threshold
          gapUpDownThreshold: 0.5,
          rsiPeriod: 14,
          rsiEntryLong: 40,  // More restrictive
          rsiEntryShort: 60,
          rsiExitLong: 35,
          rsiExitShort: 65,
          slopeLookback: 3,
          capital: 100000,
          maxLossPct: 0.03,  // Lower risk
          positionSize: 1,
          maxLots: 3,  // Fewer lots
          pyramidingEnabled: true,
          exitMode: 'FIFO',
          misExitTime: '15:15',
          cncExitTime: '15:15'
        }
      }
    },
    {
      name: 'Aggressive Parameters',
      description: 'More aggressive entry/exit thresholds',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2015-01-09T00:00:00.000Z'),
        endDate: new Date('2025-07-25T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '10year-aggressive',
          name: 'Aggressive 10-Year Strategy',
          symbol: 'NIFTY',
          timeframe: '15m',
          emaFastPeriod: 9,
          emaSlowPeriod: 21,
          atrPeriod: 14,
          atrMultiplierEntry: 0.4,  // Lower threshold
          atrMultiplierUnwind: 0.4,
          strongCandleThreshold: 0.05,  // Lower threshold
          gapUpDownThreshold: 0.2,
          rsiPeriod: 14,
          rsiEntryLong: 55,  // Less restrictive
          rsiEntryShort: 45,
          rsiExitLong: 50,
          rsiExitShort: 50,
          slopeLookback: 3,
          capital: 100000,
          maxLossPct: 0.08,  // Higher risk
          positionSize: 1,
          maxLots: 8,  // More lots
          pyramidingEnabled: true,
          exitMode: 'FIFO',
          misExitTime: '15:15',
          cncExitTime: '15:15'
        }
      }
    },
    {
      name: 'Recent 5 Years (2020-2025)',
      description: 'Focus on recent market conditions',
      config: {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
        endDate: new Date('2025-07-25T23:59:59.000Z'),
        initialBalance: 100000,
        strategyConfig: {
          id: '5year-recent',
          name: 'Recent 5-Year Strategy',
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
        timeout: 300000 // 5 minutes timeout
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
  console.log('📊 10-YEAR BACKTEST SUMMARY REPORT');
  console.log('='.repeat(80));
  
  console.log('\n🏆 PERFORMANCE COMPARISON:');
  console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Strategy                        │ Trades   │ Return   │ Win Rate │ Drawdown │ Sharpe   │');
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
  
  // Find best performing strategy
  const bestStrategy = results.reduce((best, current) => {
    if (current.totalReturn > best.totalReturn) {
      return current;
    }
    return best;
  }, results[0]);
  
  console.log(`\n🏆 BEST PERFORMING STRATEGY: ${bestStrategy.name}`);
  console.log(`   📈 Total Return: ${bestStrategy.totalReturn.toFixed(2)}%`);
  console.log(`   💰 Final Balance: ₹${bestStrategy.finalBalance.toLocaleString()}`);
  console.log(`   🎯 Win Rate: ${bestStrategy.winRate.toFixed(2)}%`);
  console.log(`   📊 Sharpe Ratio: ${bestStrategy.sharpeRatio.toFixed(2)}`);
  
  // Risk analysis
  console.log('\n⚠️  RISK ANALYSIS:');
  const highDrawdownStrategies = results.filter(r => r.maxDrawdown > 20);
  if (highDrawdownStrategies.length > 0) {
    console.log('   ⚠️  High drawdown strategies (>20%):');
    highDrawdownStrategies.forEach(s => {
      console.log(`      - ${s.name}: ${s.maxDrawdown.toFixed(2)}% drawdown`);
    });
  }
  
  const lowWinRateStrategies = results.filter(r => r.winRate < 40);
  if (lowWinRateStrategies.length > 0) {
    console.log('   ⚠️  Low win rate strategies (<40%):');
    lowWinRateStrategies.forEach(s => {
      console.log(`      - ${s.name}: ${s.winRate.toFixed(2)}% win rate`);
    });
  }
  
  console.log('\n🎉 10-year backtest analysis completed!');
  
  return results;
}

// Run the backtest
run10YearBacktest().catch(error => {
  console.error('❌ Backtest failed:', error);
});
