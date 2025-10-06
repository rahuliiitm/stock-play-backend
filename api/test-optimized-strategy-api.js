const axios = require('axios');

/**
 * Test Optimized Strategy via API
 * 
 * Uses the optimized configuration to fix the win/loss ratio issue:
 * - ATR Decline: 8% (was 5%) - let winners run longer
 * - RSI Exits: 35/65 (was 25/75) - cut losers quicker
 * - Max Lots: 8 (was 10) - better risk control
 */
async function testOptimizedStrategyAPI() {
  console.log('🎯 Testing Optimized Strategy via API...\n');

  const baseUrl = 'http://localhost:20003'; // Use the correct port from logs
  
  const optimizedConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-06-30T23:59:59.000Z',
    initialBalance: 100000,
    strategyConfig: {
      id: 'optimized-strategy-api-test',
      name: 'Optimized Strategy API Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      
      // EMA Parameters (unchanged)
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      
      // ATR Parameters (OPTIMIZED for better risk/reward)
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,        // 8% decline (was 5%) - let winners run longer
      atrExpansionThreshold: 0.01,      // 1% expansion (unchanged) - sensitive entry
      
      // RSI Parameters (OPTIMIZED for better exits)
      rsiPeriod: 14,
      rsiEntryLong: 30,                 // Entry thresholds (unchanged)
      rsiEntryShort: 70,                // Entry thresholds (unchanged)
      rsiExitLong: 35,                  // Tighter exit (was 25) - cut losers quicker
      rsiExitShort: 65,                 // Tighter exit (was 75) - cut losers quicker
      
      // Position Management (OPTIMIZED)
      maxLots: 8,                       // Reduced from 10 to 8 for better risk control
      pyramidingEnabled: true,
      exitMode: 'FIFO',
      
      // Other Parameters (unchanged)
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      
      // Time Exits (disabled for backtesting)
      misExitTime: null,
      cncExitTime: null,
    },
  };

  try {
    console.log('⚙️  Optimized Strategy Configuration:');
    console.log(`   📊 ATR Decline Threshold: ${optimizedConfig.strategyConfig.atrDeclineThreshold * 100}% (was 5%)`);
    console.log(`   📊 ATR Expansion Threshold: ${optimizedConfig.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   📊 RSI Entry Long: ${optimizedConfig.strategyConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${optimizedConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   📊 RSI Exit Long: ${optimizedConfig.strategyConfig.rsiExitLong} (was 25)`);
    console.log(`   📊 RSI Exit Short: ${optimizedConfig.strategyConfig.rsiExitShort} (was 75)`);
    console.log(`   🔄 Pyramiding Enabled: ${optimizedConfig.strategyConfig.pyramidingEnabled}`);
    console.log(`   🚪 Exit Mode: ${optimizedConfig.strategyConfig.exitMode}`);
    console.log(`   📤 Max Lots: ${optimizedConfig.strategyConfig.maxLots} (was 10)`);
    console.log(`   ⏰ Time Exits: ${optimizedConfig.strategyConfig.misExitTime === null && optimizedConfig.strategyConfig.cncExitTime === null ? 'Disabled' : 'Enabled'}\n`);

    console.log('🎯 Key Optimizations:');
    console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)');
    console.log('   ✅ Better risk control (reduced max lots: 8 vs 10)');
    console.log('   ✅ No new parameters (avoided compatibility issues)\n');

    console.log('📤 Sending request to API...');
    const startTime = process.hrtime.bigint();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, optimizedConfig, {
      timeout: 300000, // 5 minutes timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds

    console.log(`✅ Optimized strategy backtest completed in ${duration.toFixed(2)}s\n`);

    const results = response.data;

    console.log(
      '================================================================================',
    );
    console.log('🎯 OPTIMIZED STRATEGY BACKTEST RESULTS');
    console.log(
      '================================================================================',
    );

    console.log('\n💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💵 Total Return: ${results.totalReturn.toFixed(2)}%`);
    console.log(`   💰 Final Balance: ₹${results.finalBalance.toFixed(2)}`);
    console.log(`   🎯 Win Rate: ${results.winRate.toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);

    console.log('\n📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);
    console.log(`   📊 Total P&L: ₹${results.totalProfitLoss.toFixed(2)}`);

    // Calculate and display risk/reward metrics
    const lossRatio = results.averageLoss / results.averageWin;
    const riskRewardRatio = results.averageWin / results.averageLoss;
    
    console.log('\n🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}x (target: >0.67x)`);
    console.log(`   📊 Win/Loss Balance: ${lossRatio < 1.5 ? '✅ GOOD' : '❌ POOR'}`);
    
    if (lossRatio < 1.5) {
      console.log('   🎉 SUCCESS: Win/Loss ratio improved!');
    } else {
      console.log('   ⚠️  WARNING: Win/Loss ratio still needs improvement');
    }

    console.log('\n🔧 OPTIMIZATION IMPROVEMENTS:');
    console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)');
    console.log('   ✅ Better risk control (reduced max lots: 8 vs 10)');
    console.log('   ✅ No new parameters (avoided compatibility issues)');

    console.log('\n📈 EXPECTED IMPROVEMENTS:');
    console.log('   📊 Better Win/Loss Ratio: Let winners run, cut losers quick');
    console.log('   📊 Improved Risk Management: Reduced position size');
    console.log('   📊 More Selective Trading: Fewer max lots');
    console.log('   📊 Better Exit Timing: Tighter RSI thresholds');

    console.log('\n🎉 Optimized strategy backtest completed!\n');
    
    // Return results for further analysis
    return {
      ...results,
      lossRatio,
      riskRewardRatio,
      optimized: true,
      optimizationType: 'api'
    };

  } catch (error) {
    console.error('❌ Optimized strategy backtest failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

testOptimizedStrategyAPI();

