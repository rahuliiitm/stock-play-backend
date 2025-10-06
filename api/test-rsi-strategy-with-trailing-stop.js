const { AppModule } = require('./dist/src/app.module');
const { NestFactory } = require('@nestjs/core');

/**
 * Test RSI 65/35 Strategy with Trailing Stop Component
 * Compares performance with and without trailing stops
 */

async function testRSIStrategyWithTrailingStop() {
  console.log('🚀 Testing RSI 65/35 Strategy with Trailing Stop Component...\n');

  try {
    // Bootstrap the application
    const app = await NestFactory.createApplicationContext(AppModule);
    const backtestOrchestrator = app.get('BacktestOrchestratorService');

    console.log('✅ Application bootstrapped successfully\n');

    // Test configurations
    const testConfigs = [
      {
        name: 'RSI 65/35 - No Trailing Stop',
        config: createBaseConfig(false),
        description: 'Baseline RSI 65/35 strategy without trailing stops'
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (1.5x)',
        config: createBaseConfig(true, 'ATR', 1.5, 0.01),
        description: 'RSI 65/35 with ATR trailing stop (1.5x ATR, 1% activation)'
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.0x)',
        config: createBaseConfig(true, 'ATR', 2.0, 0.01),
        description: 'RSI 65/35 with ATR trailing stop (2.0x ATR, 1% activation)'
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.5x)',
        config: createBaseConfig(true, 'ATR', 2.5, 0.01),
        description: 'RSI 65/35 with ATR trailing stop (2.5x ATR, 1% activation)'
      },
      {
        name: 'RSI 65/35 - Percentage Trailing Stop (1.5%)',
        config: createBaseConfig(true, 'PERCENTAGE', 1.5, 0.01),
        description: 'RSI 65/35 with percentage trailing stop (1.5%, 1% activation)'
      },
      {
        name: 'RSI 65/35 - Percentage Trailing Stop (2.0%)',
        config: createBaseConfig(true, 'PERCENTAGE', 2.0, 0.01),
        description: 'RSI 65/35 with percentage trailing stop (2.0%, 1% activation)'
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.0x, 0.5% activation)',
        config: createBaseConfig(true, 'ATR', 2.0, 0.005),
        description: 'RSI 65/35 with ATR trailing stop (2.0x ATR, 0.5% activation)'
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.0x, 1.5% activation)',
        config: createBaseConfig(true, 'ATR', 2.0, 0.015),
        description: 'RSI 65/35 with ATR trailing stop (2.0x ATR, 1.5% activation)'
      }
    ];

    const results = [];

    // Run tests for each configuration
    for (let i = 0; i < testConfigs.length; i++) {
      const testConfig = testConfigs[i];
      console.log(`📊 Test ${i + 1}/${testConfigs.length}: ${testConfig.name}`);
      console.log(`   ${testConfig.description}`);
      
      try {
        const startTime = Date.now();
        const result = await backtestOrchestrator.executeBacktest(testConfig.config);
        const endTime = Date.now();
        
        const testResult = {
          name: testConfig.name,
          description: testConfig.description,
          processingTime: endTime - startTime,
          totalReturn: result.totalReturn,
          totalReturnPercentage: result.totalReturnPercentage,
          totalTrades: result.totalTrades,
          winningTrades: result.winningTrades,
          losingTrades: result.losingTrades,
          winRate: result.winRate,
          averageWin: result.averageWin,
          averageLoss: result.averageLoss,
          profitFactor: result.profitFactor,
          maxDrawdown: result.maxDrawdown,
          sharpeRatio: result.sharpeRatio
        };

        results.push(testResult);

        console.log(`   ✅ Completed in ${testResult.processingTime}ms`);
        console.log(`   📈 Return: ₹${testResult.totalReturn.toFixed(2)} (${testResult.totalReturnPercentage.toFixed(2)}%)`);
        console.log(`   📊 Trades: ${testResult.totalTrades} (${testResult.winRate.toFixed(1)}% win rate)`);
        console.log(`   💰 Avg Win: ₹${testResult.averageWin.toFixed(2)}, Avg Loss: ₹${testResult.averageLoss.toFixed(2)}`);
        console.log(`   📉 Max DD: ${testResult.maxDrawdown.toFixed(2)}%, Sharpe: ${testResult.sharpeRatio.toFixed(2)}`);
        console.log('');

      } catch (error) {
        console.error(`   ❌ Test failed: ${error.message}`);
        console.log('');
      }
    }

    // Generate comparison report
    console.log('📊 TRAILING STOP COMPONENT TEST RESULTS');
    console.log('=' .repeat(80));
    generateComparisonReport(results);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

function createBaseConfig(trailingStopEnabled, trailingStopType = 'ATR', atrMultiplier = 2.0, activationProfit = 0.01) {
  return {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2023-01-01T00:00:00.000Z'),
    endDate: new Date('2023-12-31T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'rsi-trailing-stop-test',
      name: 'RSI 65/35 with Trailing Stop Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.002,
      atrRequiredForEntry: false,
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 65,
      rsiExitShort: 35,
      trailingStopEnabled,
      trailingStopType,
      trailingStopATRMultiplier: atrMultiplier,
      trailingStopPercentage: trailingStopType === 'PERCENTAGE' ? atrMultiplier / 100 : 0.02,
      trailingStopActivationProfit: activationProfit,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 15,
      pyramidingEnabled: true,
      exitMode: 'LIFO',
      misExitTime: null,
      cncExitTime: null,
      maxConsecutiveLosses: 10,
      maxDrawdownStop: 0.2,
      positionSizingMode: 'CONSERVATIVE'
    }
  };
}

function generateComparisonReport(results) {
  if (results.length === 0) {
    console.log('No results to compare');
    return;
  }

  // Find baseline (no trailing stop)
  const baseline = results.find(r => r.name.includes('No Trailing Stop'));
  if (!baseline) {
    console.log('No baseline found for comparison');
    return;
  }

  console.log(`\n📊 BASELINE (No Trailing Stop):`);
  console.log(`   Return: ₹${baseline.totalReturn.toFixed(2)} (${baseline.totalReturnPercentage.toFixed(2)}%)`);
  console.log(`   Trades: ${baseline.totalTrades}, Win Rate: ${baseline.winRate.toFixed(1)}%`);
  console.log(`   Avg Win: ₹${baseline.averageWin.toFixed(2)}, Avg Loss: ₹${baseline.averageLoss.toFixed(2)}`);
  console.log(`   Max DD: ${baseline.maxDrawdown.toFixed(2)}%, Sharpe: ${baseline.sharpeRatio.toFixed(2)}`);

  console.log(`\n📈 TRAILING STOP COMPARISONS:`);
  console.log('-' .repeat(80));
  console.log('Configuration'.padEnd(40) + 'Return%'.padEnd(10) + 'Win%'.padEnd(8) + 'Avg Win'.padEnd(10) + 'Avg Loss'.padEnd(10) + 'Max DD%'.padEnd(10));
  console.log('-' .repeat(80));

  results.forEach(result => {
    if (result.name === baseline.name) return;

    const returnImprovement = result.totalReturnPercentage - baseline.totalReturnPercentage;
    const winRateImprovement = result.winRate - baseline.winRate;
    const avgWinImprovement = result.averageWin - baseline.averageWin;
    const avgLossImprovement = result.averageLoss - baseline.averageLoss;
    const maxDDImprovement = result.maxDrawdown - baseline.maxDrawdown;

    const returnStr = `${result.totalReturnPercentage.toFixed(1)}% (${returnImprovement >= 0 ? '+' : ''}${returnImprovement.toFixed(1)})`;
    const winStr = `${result.winRate.toFixed(1)}% (${winRateImprovement >= 0 ? '+' : ''}${winRateImprovement.toFixed(1)})`;
    const avgWinStr = `₹${result.averageWin.toFixed(0)} (${avgWinImprovement >= 0 ? '+' : ''}₹${avgWinImprovement.toFixed(0)})`;
    const avgLossStr = `₹${result.averageLoss.toFixed(0)} (${avgLossImprovement >= 0 ? '+' : ''}₹${avgLossImprovement.toFixed(0)})`;
    const maxDDStr = `${result.maxDrawdown.toFixed(1)}% (${maxDDImprovement >= 0 ? '+' : ''}${maxDDImprovement.toFixed(1)})`;

    console.log(
      result.name.substring(0, 39).padEnd(40) +
      returnStr.padEnd(10) +
      winStr.padEnd(8) +
      avgWinStr.padEnd(10) +
      avgLossStr.padEnd(10) +
      maxDDStr.padEnd(10)
    );
  });

  // Find best performing configuration
  const bestReturn = results.reduce((best, current) => 
    current.totalReturnPercentage > best.totalReturnPercentage ? current : best
  );
  
  const bestWinRate = results.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  );

  const bestAvgWin = results.reduce((best, current) => 
    current.averageWin > best.averageWin ? current : best
  );

  console.log(`\n🏆 BEST PERFORMERS:`);
  console.log(`   Best Return: ${bestReturn.name} (${bestReturn.totalReturnPercentage.toFixed(2)}%)`);
  console.log(`   Best Win Rate: ${bestWinRate.name} (${bestWinRate.winRate.toFixed(1)}%)`);
  console.log(`   Best Avg Win: ${bestAvgWin.name} (₹${bestAvgWin.averageWin.toFixed(2)})`);

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  const recommendations = generateRecommendations(results, baseline);
  recommendations.forEach(rec => console.log(`   ${rec}`));
}

function generateRecommendations(results, baseline) {
  const recommendations = [];

  // Find configurations that improve return
  const improvedReturn = results.filter(r => 
    r.totalReturnPercentage > baseline.totalReturnPercentage && 
    r.name !== baseline.name
  );

  if (improvedReturn.length > 0) {
    const bestReturn = improvedReturn.reduce((best, current) => 
      current.totalReturnPercentage > best.totalReturnPercentage ? current : best
    );
    recommendations.push(`✅ Best Return Improvement: ${bestReturn.name} (+${(bestReturn.totalReturnPercentage - baseline.totalReturnPercentage).toFixed(1)}%)`);
  }

  // Find configurations that improve win rate
  const improvedWinRate = results.filter(r => 
    r.winRate > baseline.winRate && 
    r.name !== baseline.name
  );

  if (improvedWinRate.length > 0) {
    const bestWinRate = improvedWinRate.reduce((best, current) => 
      current.winRate > best.winRate ? current : best
    );
    recommendations.push(`✅ Best Win Rate Improvement: ${bestWinRate.name} (+${(bestWinRate.winRate - baseline.winRate).toFixed(1)}%)`);
  }

  // Find configurations that improve average win
  const improvedAvgWin = results.filter(r => 
    r.averageWin > baseline.averageWin && 
    r.name !== baseline.name
  );

  if (improvedAvgWin.length > 0) {
    const bestAvgWin = improvedAvgWin.reduce((best, current) => 
      current.averageWin > best.averageWin ? current : best
    );
    recommendations.push(`✅ Best Average Win Improvement: ${bestAvgWin.name} (+₹${(bestAvgWin.averageWin - baseline.averageWin).toFixed(0)})`);
  }

  // Find configurations that reduce average loss
  const reducedAvgLoss = results.filter(r => 
    r.averageLoss < baseline.averageLoss && 
    r.name !== baseline.name
  );

  if (reducedAvgLoss.length > 0) {
    const bestAvgLoss = reducedAvgLoss.reduce((best, current) => 
      current.averageLoss < best.averageLoss ? current : best
    );
    recommendations.push(`✅ Best Average Loss Reduction: ${bestAvgLoss.name} (₹${(bestAvgLoss.averageLoss - baseline.averageLoss).toFixed(0)})`);
  }

  if (recommendations.length === 0) {
    recommendations.push('⚠️  No significant improvements found. Consider different parameters or strategies.');
  }

  return recommendations;
}

// Run the tests
testRSIStrategyWithTrailingStop().catch(console.error);


