/**
 * Simple RSI Strategy with Trailing Stop Test
 * Tests the RSI 65/35 strategy with different trailing stop configurations
 * Uses the existing run-optimized-backtest-direct.js approach
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testRSIStrategyWithTrailingStop() {
  console.log('🚀 Testing RSI 65/35 Strategy with Trailing Stop Component...\n');

  try {
    // Test configurations
    const testConfigs = [
      {
        name: 'RSI 65/35 - No Trailing Stop',
        description: 'Baseline RSI 65/35 strategy without trailing stops',
        trailingStopEnabled: false
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (1.5x)',
        description: 'RSI 65/35 with ATR trailing stop (1.5x ATR, 1% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 1.5,
        trailingStopPercentage: 0.02,
        trailingStopActivationProfit: 0.01
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.0x)',
        description: 'RSI 65/35 with ATR trailing stop (2.0x ATR, 1% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0,
        trailingStopPercentage: 0.02,
        trailingStopActivationProfit: 0.01
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.5x)',
        description: 'RSI 65/35 with ATR trailing stop (2.5x ATR, 1% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.5,
        trailingStopPercentage: 0.02,
        trailingStopActivationProfit: 0.01
      },
      {
        name: 'RSI 65/35 - Percentage Trailing Stop (1.5%)',
        description: 'RSI 65/35 with percentage trailing stop (1.5%, 1% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'PERCENTAGE',
        trailingStopATRMultiplier: 2.0,
        trailingStopPercentage: 0.015,
        trailingStopActivationProfit: 0.01
      },
      {
        name: 'RSI 65/35 - Percentage Trailing Stop (2.0%)',
        description: 'RSI 65/35 with percentage trailing stop (2.0%, 1% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'PERCENTAGE',
        trailingStopATRMultiplier: 2.0,
        trailingStopPercentage: 0.02,
        trailingStopActivationProfit: 0.01
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.0x, 0.5% activation)',
        description: 'RSI 65/35 with ATR trailing stop (2.0x ATR, 0.5% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0,
        trailingStopPercentage: 0.02,
        trailingStopActivationProfit: 0.005
      },
      {
        name: 'RSI 65/35 - ATR Trailing Stop (2.0x, 1.5% activation)',
        description: 'RSI 65/35 with ATR trailing stop (2.0x ATR, 1.5% activation)',
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0,
        trailingStopPercentage: 0.02,
        trailingStopActivationProfit: 0.015
      }
    ];

    const results = [];

    // Run tests for each configuration
    for (let i = 0; i < testConfigs.length; i++) {
      const testConfig = testConfigs[i];
      console.log(`📊 Test ${i + 1}/${testConfigs.length}: ${testConfig.name}`);
      console.log(`   ${testConfig.description}`);
      
      try {
        const result = await runBacktestWithConfig(testConfig);
        results.push(result);
        console.log(`   ✅ Completed`);
        console.log(`   📈 Return: ₹${result.totalReturn.toFixed(2)} (${result.totalReturnPercentage.toFixed(2)}%)`);
        console.log(`   📊 Trades: ${result.totalTrades} (${result.winRate.toFixed(1)}% win rate)`);
        console.log(`   💰 Avg Win: ₹${result.averageWin.toFixed(2)}, Avg Loss: ₹${result.averageLoss.toFixed(2)}`);
        console.log(`   📉 Max DD: ${result.maxDrawdown.toFixed(2)}%, Sharpe: ${result.sharpeRatio.toFixed(2)}`);
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

async function runBacktestWithConfig(testConfig) {
  return new Promise((resolve, reject) => {
    // Create a temporary config file for this test
    const configContent = createBacktestConfig(testConfig);
    const configPath = path.join(__dirname, `temp-config-${Date.now()}.js`);
    
    fs.writeFileSync(configPath, configContent);

    // Run the backtest using the existing script
    const child = spawn('node', ['run-optimized-backtest-direct.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(configPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      if (code !== 0) {
        reject(new Error(`Backtest failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        // Parse the results from the output
        const result = parseBacktestOutput(output);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse results: ${error.message}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start backtest: ${error.message}`));
    });
  });
}

function createBacktestConfig(testConfig) {
  return `
const { AppModule } = require('./dist/src/app.module');
const { NestFactory } = require('@nestjs/core');

async function runBacktest() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const backtestOrchestrator = app.get('BacktestOrchestratorService');

    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2023-01-01T00:00:00.000Z'),
      endDate: new Date('2023-12-31T23:59:59.000Z'),
      initialBalance: 100000,
      strategyConfig: {
        id: 'rsi-trailing-stop-test',
        name: '${testConfig.name}',
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
        trailingStopEnabled: ${testConfig.trailingStopEnabled},
        trailingStopType: '${testConfig.trailingStopType || 'ATR'}',
        trailingStopATRMultiplier: ${testConfig.trailingStopATRMultiplier || 2.0},
        trailingStopPercentage: ${testConfig.trailingStopPercentage || 0.02},
        trailingStopActivationProfit: ${testConfig.trailingStopActivationProfit || 0.01},
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

    const result = await backtestOrchestrator.executeBacktest(config);
    
    console.log('RESULT_START');
    console.log(JSON.stringify({
      name: '${testConfig.name}',
      description: '${testConfig.description}',
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
    }));
    console.log('RESULT_END');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

runBacktest().catch(console.error);
`;
}

function parseBacktestOutput(output) {
  const resultStart = output.indexOf('RESULT_START');
  const resultEnd = output.indexOf('RESULT_END');
  
  if (resultStart === -1 || resultEnd === -1) {
    throw new Error('Could not find result markers in output');
  }

  const resultJson = output.substring(resultStart + 'RESULT_START'.length, resultEnd).trim();
  return JSON.parse(resultJson);
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

  if (recommendations.length === 0) {
    recommendations.push('⚠️  No significant improvements found. Consider different parameters or strategies.');
  }

  return recommendations;
}

// Run the tests
testRSIStrategyWithTrailingStop().catch(console.error);


