const axios = require('axios');

/**
 * Test EMA fix with comprehensive backtest
 */
async function testEMAFix() {
  console.log('🧪 Testing EMA fix with comprehensive backtest...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test configuration with reasonable parameters
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'ema-fix-test',
      name: 'EMA Fix Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrMultiplierEntry: 0.1,        // More reasonable threshold
      atrMultiplierUnwind: 0.3,
      strongCandleThreshold: 0.1,      // More reasonable threshold
      gapUpDownThreshold: 0.1,         // More reasonable threshold
      rsiPeriod: 14,
      rsiEntryLong: 50,                // More reasonable RSI
      rsiEntryShort: 50,              // More reasonable RSI
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
    console.log('📤 Running EMA fix test...');
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, config, {
      timeout: 120000
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Test completed in ${duration.toFixed(2)}s`);
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 EMA FIX TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n💰 PERFORMANCE METRICS:`);
    console.log(`   📈 Total Trades: ${response.data.totalTrades || 0}`);
    console.log(`   💵 Total Return: ${response.data.totalReturnPercentage || 0}%`);
    console.log(`   💰 Final Balance: ₹${(response.data.finalBalance || 0).toLocaleString()}`);
    console.log(`   🎯 Win Rate: ${response.data.winRate || 0}%`);
    console.log(`   📉 Max Drawdown: ${response.data.maxDrawdown || 0}%`);
    console.log(`   📊 Sharpe Ratio: ${response.data.sharpeRatio || 0}`);
    
    // Trade breakdown
    console.log(`\n📊 TRADE BREAKDOWN:`);
    console.log(`   🟢 Winning Trades: ${response.data.winningTrades || 0}`);
    console.log(`   🔴 Losing Trades: ${response.data.losingTrades || 0}`);
    console.log(`   📊 Average Win: ${response.data.avgWin || 0}%`);
    console.log(`   📊 Average Loss: ${response.data.avgLoss || 0}%`);
    console.log(`   📊 Profit Factor: ${response.data.profitFactor || 0}`);
    
    // Analysis
    console.log(`\n🔍 ANALYSIS:`);
    if (response.data.totalTrades > 0) {
      console.log(`   ✅ EMA calculation is working - trades are being generated`);
      console.log(`   📊 Strategy is functional with ${response.data.totalTrades} trades`);
      
      if (response.data.totalReturnPercentage > 0) {
        console.log(`   📈 Positive returns: ${response.data.totalReturnPercentage}%`);
      } else {
        console.log(`   📉 Negative returns: ${response.data.totalReturnPercentage}%`);
      }
      
      if (response.data.winRate > 40) {
        console.log(`   🎯 Good win rate: ${response.data.winRate}%`);
      } else {
        console.log(`   ⚠️  Low win rate: ${response.data.winRate}%`);
      }
    } else {
      console.log(`   ⚠️  No trades generated - parameters may need adjustment`);
    }
    
    console.log('\n🎉 EMA fix test completed!');
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the test
testEMAFix().catch(error => {
  console.error('❌ EMA fix test failed:', error);
});
