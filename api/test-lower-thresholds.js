const axios = require('axios');

/**
 * Test with much lower ATR thresholds to generate trades
 */
async function testLowerThresholds() {
  console.log('🧪 Testing with lower ATR thresholds...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test with very low thresholds to force trades
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'low-threshold-test',
      name: 'Low Threshold Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrMultiplierEntry: 0.05,  // Very low threshold
      atrMultiplierUnwind: 0.3,
      strongCandleThreshold: 0.01,  // Very low threshold
      gapUpDownThreshold: 0.01,  // Very low threshold
      rsiPeriod: 14,
      rsiEntryLong: 60,  // More permissive
      rsiEntryShort: 40,  // More permissive
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
    console.log('📤 Sending backtest request with low thresholds...');
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, config, {
      timeout: 60000 // 1 minute timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Backtest completed in ${duration.toFixed(2)}s`);
    
    console.log(`📊 Results:`);
    console.log(`   💰 Total Trades: ${response.data.totalTrades || 0}`);
    console.log(`   📈 Total Return: ${response.data.totalReturnPercentage || 0}%`);
    console.log(`   💵 Final Balance: ₹${response.data.finalBalance || 0}`);
    console.log(`   🎯 Win Rate: ${response.data.winRate || 0}%`);
    console.log(`   📉 Max Drawdown: ${response.data.maxDrawdown || 0}%`);
    console.log(`   📊 Sharpe Ratio: ${response.data.sharpeRatio || 0}`);
    
    if (response.data.totalTrades > 0) {
      console.log(`\n🎉 SUCCESS! Generated ${response.data.totalTrades} trades with low thresholds!`);
      console.log(`📈 This confirms the strategy works, but needs parameter tuning.`);
    } else {
      console.log(`\n❌ Still no trades generated. Need to investigate further.`);
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testLowerThresholds().catch(error => {
  console.error('❌ Test failed:', error);
});
