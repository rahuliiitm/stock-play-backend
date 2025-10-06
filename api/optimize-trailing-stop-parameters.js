const { AppModule } = require('./dist/src/app.module');
const { NestFactory } = require('@nestjs/core');

/**
 * Trailing Stop Parameter Optimization Script
 * Tests different ATR multipliers, activation profits, and trailing stop types
 */

async function optimizeTrailingStopParameters() {
  console.log('🚀 Optimizing Trailing Stop Parameters...\n');

  try {
    // Bootstrap the application
    const app = await NestFactory.createApplicationContext(AppModule);
    const backtestOrchestrator = app.get('BacktestOrchestratorService');

    console.log('✅ Application bootstrapped successfully\n');

    // Parameter optimization matrix
    const optimizationMatrix = [
      // ATR-based optimizations
      { type: 'ATR', multiplier: 1.0, activation: 0.005, name: 'ATR 1.0x, 0.5% activation' },
      { type: 'ATR', multiplier: 1.0, activation: 0.01, name: 'ATR 1.0x, 1.0% activation' },
      { type: 'ATR', multiplier: 1.0, activation: 0.015, name: 'ATR 1.0x, 1.5% activation' },
      { type: 'ATR', multiplier: 1.5, activation: 0.005, name: 'ATR 1.5x, 0.5% activation' },
      { type: 'ATR', multiplier: 1.5, activation: 0.01, name: 'ATR 1.5x, 1.0% activation' },
      { type: 'ATR', multiplier: 1.5, activation: 0.015, name: 'ATR 1.5x, 1.5% activation' },
      { type: 'ATR', multiplier: 2.0, activation: 0.005, name: 'ATR 2.0x, 0.5% activation' },
      { type: 'ATR', multiplier: 2.0, activation: 0.01, name: 'ATR 2.0x, 1.0% activation' },
      { type: 'ATR', multiplier: 2.0, activation: 0.015, name: 'ATR 2.0x, 1.5% activation' },
      { type: 'ATR', multiplier: 2.5, activation: 0.005, name: 'ATR 2.5x, 0.5% activation' },
      { type: 'ATR', multiplier: 2.5, activation: 0.01, name: 'ATR 2.5x, 1.0% activation' },
      { type: 'ATR', multiplier: 2.5, activation: 0.015, name: 'ATR 2.5x, 1.5% activation' },
      { type: 'ATR', multiplier: 3.0, activation: 0.005, name: 'ATR 3.0x, 0.5% activation' },
      { type: 'ATR', multiplier: 3.0, activation: 0.01, name: 'ATR 3.0x, 1.0% activation' },
      { type: 'ATR', multiplier: 3.0, activation: 0.015, name: 'ATR 3.0x, 1.5% activation' },
      
      // Percentage-based optimizations
      { type: 'PERCENTAGE', multiplier: 1.0, activation: 0.005, name: 'Percentage 1.0%, 0.5% activation' },
      { type: 'PERCENTAGE', multiplier: 1.0, activation: 0.01, name: 'Percentage 1.0%, 1.0% activation' },
      { type: 'PERCENTAGE', multiplier: 1.0, activation: 0.015, name: 'Percentage 1.0%, 1.5% activation' },
      { type: 'PERCENTAGE', multiplier: 1.5, activation: 0.005, name: 'Percentage 1.5%, 0.5% activation' },
      { type: 'PERCENTAGE', multiplier: 1.5, activation: 0.01, name: 'Percentage 1.5%, 1.0% activation' },
      { type: 'PERCENTAGE', multiplier: 1.5, activation: 0.015, name: 'Percentage 1.5%, 1.5% activation' },
      { type: 'PERCENTAGE', multiplier: 2.0, activation: 0.005, name: 'Percentage 2.0%, 0.5% activation' },
      { type: 'PERCENTAGE', multiplier: 2.0, activation: 0.01, name: 'Percentage 2.0%, 1.0% activation' },
      { type: 'PERCENTAGE', multiplier: 2.0, activation: 0.015, name: 'Percentage 2.0%, 1.5% activation' },
      { type: 'PERCENTAGE', multiplier: 2.5, activation: 0.005, name: 'Percentage 2.5%, 0.5% activation' },
      { type: 'PERCENTAGE', multiplier: 2.5, activation: 0.01, name: 'Percentage 2.5%, 1.0% activation' },
      { type: 'PERCENTAGE', multiplier: 2.5, activation: 0.015, name: 'Percentage 2.5%, 1.5% activation' },
      { type: 'PERCENTAGE', multiplier: 3.0, activation: 0.005, name: 'Percentage 3.0%, 0.5% activation' },
      { type: 'PERCENTAGE', multiplier: 3.0, activation: 0.01, name: 'Percentage 3.0%, 1.0% activation' },
      { type: 'PERCENTAGE', multiplier: 3.0, activation: 0.015, name: 'Percentage 3.0%, 1.5% activation' }
    ];

    const results = [];
    const totalTests = optimizationMatrix.length;

    console.log(`📊 Running ${totalTests} parameter optimization tests...\n`);

    // Run baseline test (no trailing stop)
    console.log('📊 Running baseline test (no trailing stop)...');
    const baselineConfig = createOptimizationConfig(false);
    const baselineResult = await backtestOrchestrator.executeBacktest(baselineConfig);
    const baseline = {
      name: 'Baseline (No Trailing Stop)',
      type: 'NONE',
      multiplier: 0,
      activation: 0,
      ...extractMetrics(baselineResult)
    };
    results.push(baseline);
    console.log(`   ✅ Baseline: ${baseline.totalReturnPercentage.toFixed(2)}% return, ${baseline.winRate.toFixed(1)}% win rate\n`);

    // Run optimization tests
    for (let i = 0; i < optimizationMatrix.length; i++) {
      const params = optimizationMatrix[i];
      console.log(`📊 Test ${i + 1}/${totalTests}: ${params.name}`);
      
      try {
        const config = createOptimizationConfig(true, params.type, params.multiplier, params.activation);
        const result = await backtestOrchestrator.executeBacktest(config);
        
        const testResult = {
          name: params.name,
          type: params.type,
          multiplier: params.multiplier,
          activation: params.activation,
          ...extractMetrics(result)
        };

        results.push(testResult);

        console.log(`   ✅ Return: ${testResult.totalReturnPercentage.toFixed(2)}%, Win Rate: ${testResult.winRate.toFixed(1)}%, Avg Win: ₹${testResult.averageWin.toFixed(0)}`);

      } catch (error) {
        console.error(`   ❌ Test failed: ${error.message}`);
        results.push({
          name: params.name,
          type: params.type,
          multiplier: params.multiplier,
          activation: params.activation,
          error: error.message,
          totalReturnPercentage: 0,
          winRate: 0,
          averageWin: 0,
          averageLoss: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0
        });
      }
    }

    // Generate optimization report
    console.log('\n📊 TRAILING STOP PARAMETER OPTIMIZATION RESULTS');
    console.log('=' .repeat(100));
    generateOptimizationReport(results, baseline);

  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    console.error(error.stack);
  }
}

function createOptimizationConfig(trailingStopEnabled, trailingStopType = 'ATR', atrMultiplier = 2.0, activationProfit = 0.01) {
  return {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2023-01-01T00:00:00.000Z'),
    endDate: new Date('2023-12-31T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'trailing-stop-optimization',
      name: 'Trailing Stop Parameter Optimization',
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

function extractMetrics(result) {
  return {
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
}

function generateOptimizationReport(results, baseline) {
  // Filter out failed tests
  const validResults = results.filter(r => !r.error);
  
  if (validResults.length === 0) {
    console.log('No valid results to analyze');
    return;
  }

  console.log(`\n📊 BASELINE PERFORMANCE:`);
  console.log(`   Return: ${baseline.totalReturnPercentage.toFixed(2)}%`);
  console.log(`   Win Rate: ${baseline.winRate.toFixed(1)}%`);
  console.log(`   Avg Win: ₹${baseline.averageWin.toFixed(2)}`);
  console.log(`   Avg Loss: ₹${baseline.averageLoss.toFixed(2)}`);
  console.log(`   Profit Factor: ${baseline.profitFactor.toFixed(2)}`);
  console.log(`   Max Drawdown: ${baseline.maxDrawdown.toFixed(2)}%`);
  console.log(`   Sharpe Ratio: ${baseline.sharpeRatio.toFixed(2)}`);

  // Find best performers by different metrics
  const bestReturn = validResults.reduce((best, current) => 
    current.totalReturnPercentage > best.totalReturnPercentage ? current : best
  );
  
  const bestWinRate = validResults.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  );

  const bestAvgWin = validResults.reduce((best, current) => 
    current.averageWin > best.averageWin ? current : best
  );

  const bestProfitFactor = validResults.reduce((best, current) => 
    current.profitFactor > best.profitFactor ? current : best
  );

  const bestSharpe = validResults.reduce((best, current) => 
    current.sharpeRatio > best.sharpeRatio ? current : best
  );

  const lowestMaxDD = validResults.reduce((best, current) => 
    current.maxDrawdown < best.maxDrawdown ? current : best
  );

  console.log(`\n🏆 BEST PERFORMERS:`);
  console.log(`   Best Return: ${bestReturn.name} (${bestReturn.totalReturnPercentage.toFixed(2)}%)`);
  console.log(`   Best Win Rate: ${bestWinRate.name} (${bestWinRate.winRate.toFixed(1)}%)`);
  console.log(`   Best Avg Win: ${bestAvgWin.name} (₹${bestAvgWin.averageWin.toFixed(2)})`);
  console.log(`   Best Profit Factor: ${bestProfitFactor.name} (${bestProfitFactor.profitFactor.toFixed(2)})`);
  console.log(`   Best Sharpe Ratio: ${bestSharpe.name} (${bestSharpe.sharpeRatio.toFixed(2)})`);
  console.log(`   Lowest Max DD: ${lowestMaxDD.name} (${lowestMaxDD.maxDrawdown.toFixed(2)}%)`);

  // Top 10 by return
  const top10ByReturn = validResults
    .filter(r => r.name !== baseline.name)
    .sort((a, b) => b.totalReturnPercentage - a.totalReturnPercentage)
    .slice(0, 10);

  console.log(`\n📈 TOP 10 BY RETURN:`);
  console.log('-' .repeat(100));
  console.log('Rank'.padEnd(6) + 'Configuration'.padEnd(40) + 'Return%'.padEnd(10) + 'Win%'.padEnd(8) + 'Avg Win'.padEnd(10) + 'Avg Loss'.padEnd(10) + 'Max DD%'.padEnd(10) + 'Sharpe'.padEnd(8));
  console.log('-' .repeat(100));

  top10ByReturn.forEach((result, index) => {
    const returnImprovement = result.totalReturnPercentage - baseline.totalReturnPercentage;
    const winImprovement = result.winRate - baseline.winRate;
    const avgWinImprovement = result.averageWin - baseline.averageWin;
    const avgLossImprovement = result.averageLoss - baseline.averageLoss;
    const maxDDImprovement = result.maxDrawdown - baseline.maxDrawdown;
    const sharpeImprovement = result.sharpeRatio - baseline.sharpeRatio;

    const returnStr = `${result.totalReturnPercentage.toFixed(1)}% (${returnImprovement >= 0 ? '+' : ''}${returnImprovement.toFixed(1)})`;
    const winStr = `${result.winRate.toFixed(1)}% (${winImprovement >= 0 ? '+' : ''}${winImprovement.toFixed(1)})`;
    const avgWinStr = `₹${result.averageWin.toFixed(0)} (${avgWinImprovement >= 0 ? '+' : ''}₹${avgWinImprovement.toFixed(0)})`;
    const avgLossStr = `₹${result.averageLoss.toFixed(0)} (${avgLossImprovement >= 0 ? '+' : ''}₹${avgLossImprovement.toFixed(0)})`;
    const maxDDStr = `${result.maxDrawdown.toFixed(1)}% (${maxDDImprovement >= 0 ? '+' : ''}${maxDDImprovement.toFixed(1)})`;
    const sharpeStr = `${result.sharpeRatio.toFixed(2)} (${sharpeImprovement >= 0 ? '+' : ''}${sharpeImprovement.toFixed(2)})`;

    console.log(
      `${(index + 1).toString().padEnd(6)}` +
      result.name.substring(0, 39).padEnd(40) +
      returnStr.padEnd(10) +
      winStr.padEnd(8) +
      avgWinStr.padEnd(10) +
      avgLossStr.padEnd(10) +
      maxDDStr.padEnd(10) +
      sharpeStr.padEnd(8)
    );
  });

  // Parameter analysis
  console.log(`\n📊 PARAMETER ANALYSIS:`);
  analyzeParameters(validResults, baseline);
}

function analyzeParameters(results, baseline) {
  // ATR vs Percentage analysis
  const atrResults = results.filter(r => r.type === 'ATR' && r.name !== baseline.name);
  const percentageResults = results.filter(r => r.type === 'PERCENTAGE' && r.name !== baseline.name);

  if (atrResults.length > 0) {
    const avgATRReturn = atrResults.reduce((sum, r) => sum + r.totalReturnPercentage, 0) / atrResults.length;
    const avgATRWinRate = atrResults.reduce((sum, r) => sum + r.winRate, 0) / atrResults.length;
    console.log(`   ATR Average Return: ${avgATRReturn.toFixed(2)}% (${atrResults.length} tests)`);
    console.log(`   ATR Average Win Rate: ${avgATRWinRate.toFixed(1)}%`);
  }

  if (percentageResults.length > 0) {
    const avgPercentageReturn = percentageResults.reduce((sum, r) => sum + r.totalReturnPercentage, 0) / percentageResults.length;
    const avgPercentageWinRate = percentageResults.reduce((sum, r) => sum + r.winRate, 0) / percentageResults.length;
    console.log(`   Percentage Average Return: ${avgPercentageReturn.toFixed(2)}% (${percentageResults.length} tests)`);
    console.log(`   Percentage Average Win Rate: ${avgPercentageWinRate.toFixed(1)}%`);
  }

  // Multiplier analysis
  const multiplierAnalysis = {};
  results.forEach(result => {
    if (result.name === baseline.name) return;
    const multiplier = result.multiplier;
    if (!multiplierAnalysis[multiplier]) {
      multiplierAnalysis[multiplier] = [];
    }
    multiplierAnalysis[multiplier].push(result);
  });

  console.log(`\n   Multiplier Analysis:`);
  Object.keys(multiplierAnalysis).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(multiplier => {
    const multiplierResults = multiplierAnalysis[multiplier];
    const avgReturn = multiplierResults.reduce((sum, r) => sum + r.totalReturnPercentage, 0) / multiplierResults.length;
    const avgWinRate = multiplierResults.reduce((sum, r) => sum + r.winRate, 0) / multiplierResults.length;
    console.log(`     ${multiplier}x: ${avgReturn.toFixed(2)}% return, ${avgWinRate.toFixed(1)}% win rate (${multiplierResults.length} tests)`);
  });

  // Activation profit analysis
  const activationAnalysis = {};
  results.forEach(result => {
    if (result.name === baseline.name) return;
    const activation = result.activation;
    if (!activationAnalysis[activation]) {
      activationAnalysis[activation] = [];
    }
    activationAnalysis[activation].push(result);
  });

  console.log(`\n   Activation Profit Analysis:`);
  Object.keys(activationAnalysis).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(activation => {
    const activationResults = activationAnalysis[activation];
    const avgReturn = activationResults.reduce((sum, r) => sum + r.totalReturnPercentage, 0) / activationResults.length;
    const avgWinRate = activationResults.reduce((sum, r) => sum + r.winRate, 0) / activationResults.length;
    console.log(`     ${(activation * 100).toFixed(1)}%: ${avgReturn.toFixed(2)}% return, ${avgWinRate.toFixed(1)}% win rate (${activationResults.length} tests)`);
  });
}

// Run the optimization
optimizeTrailingStopParameters().catch(console.error);


