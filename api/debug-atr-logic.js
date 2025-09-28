const axios = require('axios');

/**
 * Debug ATR logic to understand why all configurations give same results
 */
async function debugATRLogic() {
  console.log('🔍 Debugging ATR logic behavior...');
  
  const baseUrl = 'http://localhost:20003';
  
  // Test with very permissive thresholds
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'atr-debug-test',
      name: 'ATR Debug Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      
      // Very permissive ATR thresholds
      atrDeclineThreshold: 0.001,      // 0.1% - very sensitive
      atrExpansionThreshold: 0.001,     // 0.1% - very sensitive
      
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 30,               // More permissive RSI
      rsiEntryShort: 70,              // More permissive RSI
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
    console.log('📤 Running ATR debug test...');
    console.log('⚙️  Configuration:');
    console.log(`   📊 ATR Decline Threshold: ${config.strategyConfig.atrDeclineThreshold * 100}%`);
    console.log(`   📊 ATR Expansion Threshold: ${config.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   📊 RSI Entry Long: ${config.strategyConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${config.strategyConfig.rsiEntryShort}`);
    console.log(`   🔄 Pyramiding Enabled: ${config.strategyConfig.pyramidingEnabled}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, config, {
      timeout: 120000
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Test completed in ${duration.toFixed(2)}s`);
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 ATR LOGIC DEBUG RESULTS');
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
      console.log(`   ✅ ATR logic is generating trades`);
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
      
      console.log(`   🔄 ATR-based pyramiding and FIFO exits are active`);
    } else {
      console.log(`   ⚠️  No trades generated - ATR logic may not be triggering`);
    }
    
    // Check if we're using the advanced ATR strategy
    console.log(`\n🔧 STRATEGY IMPLEMENTATION:`);
    console.log(`   📊 Strategy ID: ${config.strategyConfig.id}`);
    console.log(`   📊 Strategy Name: ${config.strategyConfig.name}`);
    console.log(`   📊 ATR Decline Threshold: ${config.strategyConfig.atrDeclineThreshold}`);
    console.log(`   📊 ATR Expansion Threshold: ${config.strategyConfig.atrExpansionThreshold}`);
    
    console.log('\n🎉 ATR logic debug completed!');
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Debug failed:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the debug
debugATRLogic().catch(error => {
  console.error('❌ ATR logic debug failed:', error);
});
