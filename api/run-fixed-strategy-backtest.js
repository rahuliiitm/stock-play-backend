const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');

async function runFixedStrategyBacktest() {
  console.log('🔧 RUNNING FIXED STRATEGY BACKTEST - REALISTIC ENTRY CONDITIONS\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const backtestOrchestrator = new BacktestOrchestratorService(dataProvider, orderExecution);

  // FIXED STRATEGY CONFIGURATION - More Realistic Entry Conditions
  const fixedConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'fixed-strategy',
      name: 'Fixed Strategy - Realistic Entry Conditions',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,        // 8% decline for exits
      atrExpansionThreshold: 0.002,     // FIXED: 0.2% instead of 1% - much more realistic!
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 30,                 // RELAXED: Back to 30 from 25
      rsiEntryShort: 70,                // RELAXED: Back to 70 from 75
      rsiExitLong: 35,                  // Tighter exit
      rsiExitShort: 65,                 // Tighter exit
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 4,                       // Reduced from 8
      pyramidingEnabled: true,
      exitMode: 'LIFO',                // LIFO exits
      misExitTime: null,
      cncExitTime: null,
      // Risk controls
      maxConsecutiveLosses: 3,
      maxDrawdownStop: 0.10,
      positionSizingMode: 'CONSERVATIVE'
    }
  };

  try {
    console.log('⚙️  FIXED STRATEGY CONFIGURATION:');
    console.log('   🔧 ATR Expansion Threshold: 0.002 (0.2%) - FIXED from 1%');
    console.log('   🔧 RSI Entry: 30/70 - RELAXED from 25/75');
    console.log('   🔧 Max Lots: 4 - REDUCED from 8');
    console.log('   🔧 Exit Mode: LIFO - CHANGED from FIFO');
    console.log('   🔧 Risk Controls: Active\n');

    console.log('🚀 Starting backtest with fixed entry conditions...\n');

    const results = await backtestOrchestrator.runBacktest(fixedConfig);

    console.log('✅ Fixed strategy backtest completed!\n');

    // Display Results
    console.log('================================================================================');
    console.log('🎯 FIXED STRATEGY BACKTEST RESULTS');
    console.log('================================================================================\n');

    console.log('💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);
    console.log(`   📉 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   📊 Sharpe Ratio: ${results.sharpeRatio ? results.sharpeRatio.toFixed(2) : 'N/A'}\n`);

    console.log('📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Total P&L: ₹${results.totalReturn.toFixed(2)}\n`);

    // Compare with previous results
    console.log('🔄 COMPARISON WITH PREVIOUS RESULTS:');
    console.log('   📊 Previous: 4 trades in 6 months');
    console.log(`   📊 Fixed: ${results.totalTrades} trades in 12 months`);
    console.log(`   📊 Improvement: ${(results.totalTrades / 4 * 12 / 6).toFixed(1)}x more trades per month\n`);

    // Risk/Reward Analysis
    const lossRatio = Math.abs(results.averageLoss) / results.averageWin;
    const riskReward = results.averageWin / Math.abs(results.averageLoss);

    console.log('🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskReward.toFixed(2)}x (target: >0.67x)`);
    console.log(`   📊 Win/Loss Balance: ${results.winRate > 0.5 ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT'}\n`);

    // Optimization Impact
    console.log('🔧 OPTIMIZATION IMPACT:');
    console.log('   ✅ ATR Threshold Fixed: 0.2% instead of 1% (5x more realistic)');
    console.log('   ✅ RSI Conditions Relaxed: 30/70 instead of 25/75');
    console.log('   ✅ LIFO Exits: Cut losses quickly, preserve winners');
    console.log('   ✅ Reduced Max Lots: Better risk management');
    console.log('   ✅ Risk Controls: Loss streak protection + drawdown stop\n');

    // Expected Improvements
    console.log('📈 EXPECTED IMPROVEMENTS:');
    if (results.totalTrades > 20) {
      console.log('   ✅ SUCCESS: Significantly more trades generated');
      console.log('   ✅ SUCCESS: Strategy is now viable for backtesting');
      console.log('   ✅ SUCCESS: Ready for parameter optimization');
    } else if (results.totalTrades > 10) {
      console.log('   ⚠️  MODERATE: Some improvement, may need further tuning');
    } else {
      console.log('   ❌ POOR: Still too few trades, needs more fixes');
    }

    console.log('\n🎯 CONCLUSION:');
    if (results.totalTrades > 20) {
      console.log('   🎉 EXCELLENT: Fixed strategy generates sufficient trades!');
      console.log('   ✅ Ready for parameter optimization and live trading');
    } else if (results.totalTrades > 10) {
      console.log('   ✅ GOOD: Significant improvement in trade frequency');
      console.log('   📊 Consider further parameter tuning');
    } else {
      console.log('   ❌ POOR: Still needs more work on entry conditions');
    }

    console.log('\n🎉 Fixed strategy backtest completed!\n');
    
    return results;

  } catch (error) {
    console.error('❌ Fixed strategy backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

runFixedStrategyBacktest().catch(console.error);


