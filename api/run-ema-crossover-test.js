const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');

async function runEMACrossoverTest() {
  console.log('🎯 STEP 1: PURE EMA CROSSOVER (9, 21) STRATEGY TEST');
  console.log('==================================================\n');

  // Create a simple EMA crossover configuration
  const emaCrossoverConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: '2014-01-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
    initialBalance: 100000,
    strategyConfig: {
      id: 'ema-crossover-test',
      name: 'Pure EMA Crossover (9, 21) Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,   // As requested
      emaSlowPeriod: 21, // As requested
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.002,
      atrRequiredForEntry: false, // Disabled for pure EMA test
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 30,
      rsiEntryShort: 70,
      rsiExitLong: 35,
      rsiExitShort: 65,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 1, // Single position for pure EMA test
      pyramidingEnabled: false, // Disabled for pure EMA test
      exitMode: 'FIFO',
      misExitTime: null,
      cncExitTime: null,
      maxConsecutiveLosses: 3,
      maxDrawdownStop: 0.1,
      positionSizingMode: 'CONSERVATIVE',
    },
  };

  console.log('📊 Configuration:');
  console.log(`   📈 EMA Fast: ${emaCrossoverConfig.strategyConfig.emaFastPeriod}`);
  console.log(`   📈 EMA Slow: ${emaCrossoverConfig.strategyConfig.emaSlowPeriod}`);
  console.log(`   📊 Timeframe: ${emaCrossoverConfig.strategyConfig.timeframe}`);
  console.log(`   📅 Period: ${emaCrossoverConfig.startDate} to ${emaCrossoverConfig.endDate}`);
  console.log(`   💰 Initial Balance: ₹${emaCrossoverConfig.initialBalance.toLocaleString()}`);
  console.log(`   📤 Max Lots: ${emaCrossoverConfig.strategyConfig.maxLots} (single position)`);
  console.log(`   🔄 Pyramiding: ${emaCrossoverConfig.strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}\n`);

  console.log('🎯 Key Features:');
  console.log('   ✅ Pure EMA crossover (9, 21) strategy');
  console.log('   ✅ Detailed logging of all values (RSI, ATR, etc.)');
  console.log('   ✅ 10-year dataset with 15-minute candles');
  console.log('   ✅ Single position (no pyramiding)');
  console.log('   ✅ FIFO exit strategy\n');

  try {
    console.log('📤 Running EMA crossover backtest...');
    const startTime = process.hrtime.bigint();
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const orchestrator = app.get(BacktestOrchestratorService);
    
    const results = await orchestrator.runBacktest(emaCrossoverConfig);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000000;

    console.log(`✅ EMA crossover backtest completed in ${duration.toFixed(2)}s\n`);

    console.log('================================================================================');
    console.log('🎯 STEP 1: PURE EMA CROSSOVER (9, 21) RESULTS');
    console.log('================================================================================\n');

    console.log('💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💰 Total Return: ₹${results.totalReturn.toLocaleString()} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}\n`);

    console.log('📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toLocaleString()}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toLocaleString()}`);
    console.log(`   📊 Total P&L: ₹${results.totalReturn.toLocaleString()}\n`);

    console.log('🎯 RISK/REWARD ANALYSIS:');
    const lossRatio = results.averageLoss !== 0 ? Math.abs(results.averageWin / results.averageLoss) : 'N/A';
    const riskReward = results.averageLoss !== 0 ? Math.abs(results.averageWin / results.averageLoss) : 'N/A';
    console.log(`   📊 Loss Ratio: ${lossRatio}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskReward}x (target: >0.67x)`);
    console.log(`   📊 Win/Loss Balance: ${results.winRate > 0.5 ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT'}\n`);

    console.log('📉 DRAWDOWN ANALYSIS:');
    console.log(`   📊 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   📊 Peak Equity: ₹${results.peakEquity.toLocaleString()}`);
    console.log(`   📊 Trough Equity: ₹${results.troughEquity.toLocaleString()}\n`);

    console.log('⏱️ DURATION ANALYSIS:');
    const startDate = new Date(emaCrossoverConfig.startDate);
    const endDate = new Date(emaCrossoverConfig.endDate);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    console.log(`   📅 Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   📅 End Date: ${endDate.toISOString().split('T')[0]}`);
    console.log(`   📅 Duration: ${durationDays} days\n`);

    console.log('🔍 DETAILED ANALYSIS:');
    console.log('   📊 Strategy: Pure EMA Crossover (9, 21)');
    console.log('   📊 Entry: EMA 9 crosses above/below EMA 21');
    console.log('   📊 Exit: Opposite crossover or end of data');
    console.log('   📊 Position: Single position (no pyramiding)');
    console.log('   📊 Timeframe: 15-minute candles\n');

    console.log('📈 TRADE FREQUENCY ANALYSIS:');
    const tradesPerYear = results.totalTrades / (durationDays / 365.25);
    console.log(`   📊 Total Trades: ${results.totalTrades}`);
    console.log(`   📊 Trades per Year: ${tradesPerYear.toFixed(1)}`);
    console.log(`   📊 Trades per Month: ${(tradesPerYear / 12).toFixed(1)}`);
    console.log(`   📊 Expected vs Actual: ${tradesPerYear > 20 ? '✅ GOOD' : '❌ TOO FEW TRADES'}\n`);

    console.log('🎯 CONCLUSION:');
    console.log('   ✅ Pure EMA crossover strategy tested');
    console.log('   ✅ Detailed metrics provided');
    console.log('   ✅ Ready for user analysis and approval\n');

    console.log('📋 NEXT STEPS:');
    console.log('   1. User to analyze these results');
    console.log('   2. User approval to proceed to Step 2 (RSI configuration)');
    console.log('   3. Add RSI conditions to EMA crossover');
    console.log('   4. Test and analyze RSI+EMA results\n');

    await app.close();
    return results;

  } catch (error) {
    console.error('❌ Error running EMA crossover backtest:', error);
    throw error;
  }
}

// Run the test
runEMACrossoverTest()
  .then((results) => {
    console.log('🎉 EMA crossover test completed successfully!');
    console.log('📊 Results summary:');
    console.log(`   - Total Trades: ${results.totalTrades}`);
    console.log(`   - Total Return: ${results.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   - Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 EMA crossover test failed:', error);
    process.exit(1);
  });
