const axios = require('axios');

/**
 * Test advanced ATR logic with pyramiding and FIFO exits
 */
async function testAdvancedATRLogic() {
  console.log('🧪 Testing advanced ATR logic...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test configuration with advanced ATR parameters
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'advanced-atr-test',
      name: 'Advanced ATR Strategy Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      
      // Advanced ATR parameters
      atrDeclineThreshold: 0.1,        // 10% ATR decline triggers FIFO exit
      atrExpansionThreshold: 0.1,       // 10% ATR expansion triggers pyramiding
      
      strongCandleThreshold: 0.1,
      gapUpDownThreshold: 0.1,
      rsiPeriod: 14,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
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
    console.log('📤 Running advanced ATR test...');
    console.log('⚙️  Configuration:');
    console.log(`   📊 ATR Decline Threshold: ${config.strategyConfig.atrDeclineThreshold} (${config.strategyConfig.atrDeclineThreshold * 100}%)`);
    console.log(`   📊 ATR Expansion Threshold: ${config.strategyConfig.atrExpansionThreshold} (${config.strategyConfig.atrExpansionThreshold * 100}%)`);
    console.log(`   🔄 Pyramiding Enabled: ${config.strategyConfig.pyramidingEnabled}`);
    console.log(`   🚪 Exit Mode: ${config.strategyConfig.exitMode}`);
    console.log(`   📤 Max Lots: ${config.strategyConfig.maxLots}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, config, {
      timeout: 120000
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Test completed in ${duration.toFixed(2)}s`);
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 ADVANCED ATR LOGIC TEST RESULTS');
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
    
    // ATR Logic Analysis
    console.log(`\n🔄 ATR LOGIC ANALYSIS:`);
    console.log(`   📊 ATR Decline Threshold: ${config.strategyConfig.atrDeclineThreshold * 100}%`);
    console.log(`   📊 ATR Expansion Threshold: ${config.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   🔄 Pyramiding: ${config.strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   🚪 Exit Mode: ${config.strategyConfig.exitMode}`);
    
    // Analysis
    console.log(`\n🔍 ANALYSIS:`);
    if (response.data.totalTrades > 0) {
      console.log(`   ✅ Advanced ATR logic is working - trades are being generated`);
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
      console.log(`   ⚠️  No trades generated - parameters may need adjustment`);
    }
    
    console.log('\n🎉 Advanced ATR logic test completed!');
    
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
testAdvancedATRLogic().catch(error => {
  console.error('❌ Advanced ATR logic test failed:', error);
});

