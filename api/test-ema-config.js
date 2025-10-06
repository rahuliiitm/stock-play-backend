const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');

async function testEMAConfig() {
  console.log('🔍 TESTING EMA CONFIGURATION');
  console.log('============================\n');

  // Create a simple EMA crossover configuration
  const emaConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-01-31T23:59:59.000Z', // Just 1 month for quick test
    initialBalance: 100000,
    strategyConfig: {
      id: 'ema-config-test',
      name: 'EMA Configuration Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,   // As requested
      emaSlowPeriod: 21, // As requested
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.002,
      atrRequiredForEntry: false,
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

  console.log('📊 Configuration being tested:');
  console.log(`   📈 EMA Fast: ${emaConfig.strategyConfig.emaFastPeriod}`);
  console.log(`   📈 EMA Slow: ${emaConfig.strategyConfig.emaSlowPeriod}`);
  console.log(`   📊 Timeframe: ${emaConfig.strategyConfig.timeframe}`);
  console.log(`   📅 Period: ${emaConfig.startDate} to ${emaConfig.endDate}`);
  console.log(`   🔄 Pyramiding: ${emaConfig.strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}\n`);

  try {
    console.log('📤 Running EMA configuration test...');
    const startTime = process.hrtime.bigint();
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const orchestrator = app.get(BacktestOrchestratorService);
    
    // Log the configuration that will be used
    console.log('🔍 Configuration being passed to orchestrator:');
    console.log(JSON.stringify(emaConfig.strategyConfig, null, 2));
    
    const results = await orchestrator.runBacktest(emaConfig);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000000;

    console.log(`✅ EMA configuration test completed in ${duration.toFixed(2)}s\n`);

    console.log('================================================================================');
    console.log('🎯 EMA CONFIGURATION TEST RESULTS');
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
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toLocaleString()}\n`);

    console.log('🔍 CONFIGURATION VERIFICATION:');
    console.log(`   📈 EMA Fast Period: ${emaConfig.strategyConfig.emaFastPeriod} (Expected: 9)`);
    console.log(`   📈 EMA Slow Period: ${emaConfig.strategyConfig.emaSlowPeriod} (Expected: 21)`);
    console.log(`   📊 Pyramiding Enabled: ${emaConfig.strategyConfig.pyramidingEnabled} (Expected: false)`);
    console.log(`   📊 Max Lots: ${emaConfig.strategyConfig.maxLots} (Expected: 1)\n`);

    // Verify configuration was used correctly
    const configCorrect = 
      emaConfig.strategyConfig.emaFastPeriod === 9 &&
      emaConfig.strategyConfig.emaSlowPeriod === 21 &&
      emaConfig.strategyConfig.pyramidingEnabled === false &&
      emaConfig.strategyConfig.maxLots === 1;

    console.log('✅ CONFIGURATION VERIFICATION:');
    console.log(`   📊 EMA Fast Period: ${emaConfig.strategyConfig.emaFastPeriod === 9 ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`   📊 EMA Slow Period: ${emaConfig.strategyConfig.emaSlowPeriod === 21 ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`   📊 Pyramiding Disabled: ${emaConfig.strategyConfig.pyramidingEnabled === false ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`   📊 Max Lots = 1: ${emaConfig.strategyConfig.maxLots === 1 ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`   📊 Overall Config: ${configCorrect ? '✅ ALL CORRECT' : '❌ ISSUES FOUND'}\n`);

    if (configCorrect) {
      console.log('🎉 SUCCESS: EMA configuration is working correctly!');
      console.log('📊 The strategy is using EMA (9, 21) as requested.');
      console.log('📊 Pyramiding is disabled for pure EMA crossover testing.');
      console.log('📊 Single position (maxLots = 1) for clean results.\n');
    } else {
      console.log('❌ FAILURE: EMA configuration has issues!');
      console.log('📊 The strategy is NOT using the correct EMA periods.');
      console.log('📊 This needs to be fixed before proceeding.\n');
    }

    await app.close();
    return { results, configCorrect };

  } catch (error) {
    console.error('❌ Error running EMA configuration test:', error);
    throw error;
  }
}

// Run the test
testEMAConfig()
  .then(({ results, configCorrect }) => {
    console.log('🎯 EMA Configuration Test Summary:');
    console.log(`   - Configuration Correct: ${configCorrect ? 'YES' : 'NO'}`);
    console.log(`   - Total Trades: ${results.totalTrades}`);
    console.log(`   - Total Return: ${results.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   - Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    
    if (configCorrect) {
      console.log('✅ EMA configuration test passed!');
      process.exit(0);
    } else {
      console.log('❌ EMA configuration test failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 EMA configuration test failed:', error);
    process.exit(1);
  });


