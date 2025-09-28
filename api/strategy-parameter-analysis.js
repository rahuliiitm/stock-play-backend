const axios = require('axios');

/**
 * Comprehensive analysis of strategy parameters for optimal performance
 */
async function analyzeStrategyParameters() {
  console.log('🔍 Analyzing strategy parameters for optimal performance...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test different parameter combinations
  const testConfigs = [
    {
      name: 'Very Low Thresholds (Current Working)',
      atrMultiplierEntry: 0.05,
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiEntryLong: 60,
      rsiEntryShort: 40,
      expectedTrades: 36
    },
    {
      name: 'Low Thresholds',
      atrMultiplierEntry: 0.1,
      strongCandleThreshold: 0.05,
      gapUpDownThreshold: 0.05,
      rsiEntryLong: 55,
      rsiEntryShort: 45,
      expectedTrades: 'Unknown'
    },
    {
      name: 'Medium Thresholds',
      atrMultiplierEntry: 0.2,
      strongCandleThreshold: 0.1,
      gapUpDownThreshold: 0.1,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      expectedTrades: 'Unknown'
    },
    {
      name: 'High Thresholds (Original)',
      atrMultiplierEntry: 0.6,
      strongCandleThreshold: 0.1,
      gapUpDownThreshold: 0.3,
      rsiEntryLong: 48,
      rsiEntryShort: 52,
      expectedTrades: 0
    }
  ];
  
  const results = [];
  
  for (const test of testConfigs) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-06-30T23:59:59.000Z'),
      initialBalance: 100000,
      strategyConfig: {
        id: `test-${test.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: test.name,
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: test.atrMultiplierEntry,
        atrMultiplierUnwind: 0.3,
        strongCandleThreshold: test.strongCandleThreshold,
        gapUpDownThreshold: test.gapUpDownThreshold,
        rsiPeriod: 14,
        rsiEntryLong: test.rsiEntryLong,
        rsiEntryShort: test.rsiEntryShort,
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
    
    try {
      console.log('📤 Running backtest...');
      const startTime = Date.now();
      
      const response = await axios.post(`${baseUrl}/backtest/run`, config, {
        timeout: 30000
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      const result = {
        name: test.name,
        atrMultiplierEntry: test.atrMultiplierEntry,
        strongCandleThreshold: test.strongCandleThreshold,
        gapUpDownThreshold: test.gapUpDownThreshold,
        rsiEntryLong: test.rsiEntryLong,
        rsiEntryShort: test.rsiEntryShort,
        duration: duration,
        totalTrades: response.data.totalTrades || 0,
        totalReturn: response.data.totalReturnPercentage || 0,
        finalBalance: response.data.finalBalance || 0,
        winRate: response.data.winRate || 0,
        maxDrawdown: response.data.maxDrawdown || 0,
        sharpeRatio: response.data.sharpeRatio || 0
      };
      
      results.push(result);
      
      console.log(`✅ Completed in ${duration.toFixed(2)}s`);
      console.log(`   💰 Trades: ${result.totalTrades}`);
      console.log(`   📈 Return: ${result.totalReturn.toFixed(2)}%`);
      console.log(`   🎯 Win Rate: ${result.winRate.toFixed(2)}%`);
      
    } catch (error) {
      console.error(`❌ Error in ${test.name}:`, error.message);
      
      results.push({
        name: test.name,
        atrMultiplierEntry: test.atrMultiplierEntry,
        strongCandleThreshold: test.strongCandleThreshold,
        gapUpDownThreshold: test.gapUpDownThreshold,
        rsiEntryLong: test.rsiEntryLong,
        rsiEntryShort: test.rsiEntryShort,
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
  
  // Analysis report
  console.log('\n' + '='.repeat(80));
  console.log('📊 STRATEGY PARAMETER ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  console.log('\n🏆 PARAMETER SENSITIVITY ANALYSIS:');
  console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Configuration                  │ Trades   │ Return   │ Win Rate │ Drawdown │ Sharpe   │');
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
  
  // Find optimal configuration
  const workingConfigs = results.filter(r => r.totalTrades > 0);
  const bestConfig = workingConfigs.reduce((best, current) => {
    if (current.totalReturn > best.totalReturn) {
      return current;
    }
    return best;
  }, workingConfigs[0]);
  
  console.log('\n🎯 OPTIMAL CONFIGURATION:');
  if (bestConfig) {
    console.log(`   📊 Configuration: ${bestConfig.name}`);
    console.log(`   📈 ATR Multiplier Entry: ${bestConfig.atrMultiplierEntry}`);
    console.log(`   💪 Strong Candle Threshold: ${bestConfig.strongCandleThreshold}`);
    console.log(`   📏 Gap Up/Down Threshold: ${bestConfig.gapUpDownThreshold}`);
    console.log(`   📊 RSI Entry Long: ${bestConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${bestConfig.rsiEntryShort}`);
    console.log(`   💰 Total Trades: ${bestConfig.totalTrades}`);
    console.log(`   📈 Total Return: ${bestConfig.totalReturn.toFixed(2)}%`);
    console.log(`   🎯 Win Rate: ${bestConfig.winRate.toFixed(2)}%`);
  } else {
    console.log('   ❌ No working configurations found');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   1. 📊 ATR Multiplier Entry: Use 0.05-0.2 for more trades');
  console.log('   2. 💪 Strong Candle Threshold: Use 0.01-0.05 for more entries');
  console.log('   3. 📏 Gap Threshold: Use 0.01-0.1 for more gap entries');
  console.log('   4. 📊 RSI Thresholds: Use 40-60 for more permissive entries');
  console.log('   5. 🔄 Consider dynamic thresholds based on market volatility');
  
  console.log('\n🎉 Parameter analysis completed!');
  
  return results;
}

// Run the analysis
analyzeStrategyParameters().catch(error => {
  console.error('❌ Analysis failed:', error);
});
