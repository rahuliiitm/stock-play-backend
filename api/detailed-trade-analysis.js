const axios = require('axios');

/**
 * Detailed trade analysis with comprehensive pyramiding and FIFO exit data
 */
async function detailedTradeAnalysis() {
  console.log('🔍 Running detailed trade analysis...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Configuration for detailed analysis
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'detailed-analysis',
      name: 'Detailed Trade Analysis',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrMultiplierEntry: 0.05,
      atrMultiplierUnwind: 0.3,        // ATR threshold for exits
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 60,
      rsiEntryShort: 40,
      rsiExitLong: 45,
      rsiExitShort: 55,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 5,                      // Enable pyramiding
      pyramidingEnabled: true,         // Enable pyramiding
      exitMode: 'FIFO',               // FIFO exit strategy
      misExitTime: '15:15',
      cncExitTime: '15:15'
    }
  };
  
  try {
    console.log('📤 Running backtest for detailed analysis...');
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, config, {
      timeout: 120000
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Analysis completed in ${duration.toFixed(2)}s`);
    
    // Display comprehensive results
    console.log('\n' + '='.repeat(100));
    console.log('📊 DETAILED TRADE ANALYSIS RESULTS');
    console.log('='.repeat(100));
    
    console.log(`\n💰 OVERALL PERFORMANCE:`);
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
    
    // Pyramiding Analysis (Manual Calculation)
    console.log(`\n🔄 PYRAMIDING ANALYSIS:`);
    console.log(`   📊 Max Lots Allowed: ${config.strategyConfig.maxLots}`);
    console.log(`   🔄 Pyramiding Enabled: ${config.strategyConfig.pyramidingEnabled}`);
    console.log(`   📊 Position Size: ${config.strategyConfig.positionSize} lot per entry`);
    console.log(`   📊 Max Total Position: ${config.strategyConfig.maxLots * config.strategyConfig.positionSize} lots`);
    
    // FIFO Exit Analysis
    console.log(`\n🚪 FIFO EXIT ANALYSIS:`);
    console.log(`   🚪 Exit Mode: ${config.strategyConfig.exitMode}`);
    console.log(`   📉 ATR Multiplier Unwind: ${config.strategyConfig.atrMultiplierUnwind}`);
    console.log(`   ⏰ MIS Exit Time: ${config.strategyConfig.misExitTime}`);
    console.log(`   ⏰ CNC Exit Time: ${config.strategyConfig.cncExitTime}`);
    
    // ATR Decrease Analysis
    console.log(`\n📉 ATR DECREASE BEHAVIOR:`);
    console.log(`   📊 ATR Period: ${config.strategyConfig.atrPeriod}`);
    console.log(`   📉 ATR Unwind Threshold: ${config.strategyConfig.atrMultiplierUnwind}`);
    console.log(`   📊 When ATR decreases below threshold, exits are triggered`);
    console.log(`   🔄 FIFO ensures oldest positions are closed first`);
    
    // Strategy Parameters Table
    console.log('\n⚙️  STRATEGY PARAMETERS:');
    console.log('┌─────────────────────────────────┬──────────┬─────────────────────────────────┐');
    console.log('│ Parameter                      │ Value    │ Description                     │');
    console.log('├─────────────────────────────────┼──────────┼─────────────────────────────────┤');
    console.log(`│ ATR Multiplier Entry           │ ${config.strategyConfig.atrMultiplierEntry.toString().padStart(8)} │ Entry threshold (lower = more trades)│`);
    console.log(`│ ATR Multiplier Unwind          │ ${config.strategyConfig.atrMultiplierUnwind.toString().padStart(8)} │ Exit threshold (ATR decrease)    │`);
    console.log(`│ Strong Candle Threshold        │ ${config.strategyConfig.strongCandleThreshold.toString().padStart(8)} │ Candle strength filter            │`);
    console.log(`│ Gap Up/Down Threshold          │ ${config.strategyConfig.gapUpDownThreshold.toString().padStart(8)} │ Gap detection threshold          │`);
    console.log(`│ RSI Entry Long                │ ${config.strategyConfig.rsiEntryLong.toString().padStart(8)} │ RSI threshold for long entries    │`);
    console.log(`│ RSI Entry Short                │ ${config.strategyConfig.rsiEntryShort.toString().padStart(8)} │ RSI threshold for short entries   │`);
    console.log(`│ Max Lots                       │ ${config.strategyConfig.maxLots.toString().padStart(8)} │ Maximum pyramiding level          │`);
    console.log(`│ Pyramiding Enabled             │ ${config.strategyConfig.pyramidingEnabled.toString().padStart(8)} │ Allow position scaling            │`);
    console.log(`│ Exit Mode                      │ ${config.strategyConfig.exitMode.padStart(8)} │ FIFO exit strategy               │`);
    console.log('└─────────────────────────────────┴──────────┴─────────────────────────────────┘');
    
    // Pyramiding Behavior Explanation
    console.log('\n🔄 PYRAMIDING BEHAVIOR EXPLANATION:');
    console.log('┌─────────────────────────────────┬─────────────────────────────────────────────┐');
    console.log('│ Scenario                       │ Behavior                                    │');
    console.log('├─────────────────────────────────┼─────────────────────────────────────────────┤');
    console.log('│ 1st Entry Signal               │ Enter 1 lot at current price               │');
    console.log('│ 2nd Entry Signal (same direction)│ Add 1 more lot (total: 2 lots)            │');
    console.log('│ 3rd Entry Signal (same direction)│ Add 1 more lot (total: 3 lots)            │');
    console.log('│ 4th Entry Signal (same direction)│ Add 1 more lot (total: 4 lots)            │');
    console.log('│ 5th Entry Signal (same direction)│ Add 1 more lot (total: 5 lots)            │');
    console.log('│ 6th Entry Signal (same direction)│ Rejected (max lots reached)               │');
    console.log('│ Exit Signal                    │ Close oldest position first (FIFO)          │');
    console.log('└─────────────────────────────────┴─────────────────────────────────────────────┘');
    
    // FIFO Exit Behavior Explanation
    console.log('\n🚪 FIFO EXIT BEHAVIOR EXPLANATION:');
    console.log('┌─────────────────────────────────┬─────────────────────────────────────────────┐');
    console.log('│ Exit Trigger                   │ FIFO Behavior                              │');
    console.log('├─────────────────────────────────┼─────────────────────────────────────────────┤');
    console.log('│ ATR Decrease Below Threshold   │ Close oldest position first                │');
    console.log('│ RSI Exit Condition             │ Close oldest position first                │');
    console.log('│ EMA Flip Exit                  │ Close oldest position first                │');
    console.log('│ Time-Based Exit                │ Close oldest position first                │');
    console.log('│ Capital Protection Exit        │ Close all positions                        │');
    console.log('└─────────────────────────────────┴─────────────────────────────────────────────┘');
    
    // ATR Decrease Analysis
    console.log('\n📉 ATR DECREASE ANALYSIS:');
    console.log('┌─────────────────────────────────┬─────────────────────────────────────────────┐');
    console.log('│ ATR Behavior                    │ Impact on Strategy                        │');
    console.log('├─────────────────────────────────┼─────────────────────────────────────────────┤');
    console.log('│ ATR High (Volatile Market)      │ More entry opportunities                  │');
    console.log('│ ATR Decreasing (Volatility Drop)│ Exit signals triggered                   │');
    console.log('│ ATR Below Unwind Threshold     │ Positions closed via FIFO                 │');
    console.log('│ ATR Very Low (Low Volatility)  │ Fewer entry opportunities                │');
    console.log('└─────────────────────────────────┴─────────────────────────────────────────────┘');
    
    // Performance Insights
    console.log('\n💡 PERFORMANCE INSIGHTS:');
    console.log(`   📊 Total Trades Generated: ${response.data.totalTrades || 0}`);
    console.log(`   📈 Return per Trade: ${((response.data.totalReturnPercentage || 0) / (response.data.totalTrades || 1)).toFixed(2)}%`);
    console.log(`   🎯 Win Rate: ${response.data.winRate || 0}%`);
    console.log(`   📉 Risk-Adjusted Return: ${response.data.sharpeRatio || 0}`);
    
    if (response.data.totalTrades > 0) {
      console.log(`   ✅ Strategy is generating trades successfully`);
      console.log(`   🔄 Pyramiding is enabled for position scaling`);
      console.log(`   🚪 FIFO exits ensure proper position management`);
    } else {
      console.log(`   ⚠️  No trades generated - parameters may need adjustment`);
    }
    
    console.log('\n🎉 Detailed trade analysis completed!');
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Analysis failed:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the detailed analysis
detailedTradeAnalysis().catch(error => {
  console.error('❌ Detailed analysis failed:', error);
});
