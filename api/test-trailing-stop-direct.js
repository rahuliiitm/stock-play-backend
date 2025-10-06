/**
 * Direct Trailing Stop Test
 * Tests different trailing stop configurations by modifying the existing script
 */

const fs = require('fs');
const path = require('path');

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
  }
];

async function testTrailingStopConfigurations() {
  console.log('🚀 Testing Trailing Stop Configurations (Direct Approach)...\n');

  const results = [];

  for (let i = 0; i < testConfigs.length; i++) {
    const testConfig = testConfigs[i];
    console.log(`📊 Test ${i + 1}/${testConfigs.length}: ${testConfig.name}`);
    console.log(`   ${testConfig.description}`);
    
    try {
      // Modify the existing run-optimized-backtest-direct.js script
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
  console.log('📊 TRAILING STOP CONFIGURATION TEST RESULTS');
  console.log('=' .repeat(80));
  generateComparisonReport(results);
}

async function runBacktestWithConfig(testConfig) {
  return new Promise((resolve, reject) => {
    // Read the existing run-optimized-backtest-direct.js file
    const originalScriptPath = path.join(__dirname, 'run-optimized-backtest-direct.js');
    let scriptContent = fs.readFileSync(originalScriptPath, 'utf8');

    // Modify the trailing stop configuration in the script
    scriptContent = scriptContent.replace(
      /trailingStopEnabled:\s*(true|false)/,
      `trailingStopEnabled: ${testConfig.trailingStopEnabled}`
    );

    if (testConfig.trailingStopEnabled) {
      scriptContent = scriptContent.replace(
        /trailingStopType:\s*'[^']*'/,
        `trailingStopType: '${testConfig.trailingStopType}'`
      );

      scriptContent = scriptContent.replace(
        /trailingStopATRMultiplier:\s*[\d.]+/,
        `trailingStopATRMultiplier: ${testConfig.trailingStopATRMultiplier}`
      );

      scriptContent = scriptContent.replace(
        /trailingStopPercentage:\s*[\d.]+/,
        `trailingStopPercentage: ${testConfig.trailingStopPercentage}`
      );

      scriptContent = scriptContent.replace(
        /trailingStopActivationProfit:\s*[\d.]+/,
        `trailingStopActivationProfit: ${testConfig.trailingStopActivationProfit}`
      );
    }

    // Create a temporary script file
    const tempScriptPath = path.join(__dirname, `temp-backtest-${Date.now()}.js`);
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Run the backtest
    const { spawn } = require('child_process');
    const child = spawn('node', [tempScriptPath], {
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
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      if (code !== 0) {
        reject(new Error(`Backtest failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        // Parse the results from the output
        const result = parseBacktestOutput(output, testConfig);
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

function parseBacktestOutput(output, testConfig) {
  // Look for the performance metrics section
  const metricsMatch = output.match(/PERFORMANCE METRICS[\s\S]*?Total Return: ₹([\d,.-]+) \(([\d.-]+)%\)[\s\S]*?Total Trades: (\d+)[\s\S]*?Win Rate: ([\d.-]+)%[\s\S]*?Average Win: ₹([\d.-]+)[\s\S]*?Average Loss: ₹([\d.-]+)[\s\S]*?Max Drawdown: ([\d.-]+)%[\s\S]*?Sharpe Ratio: ([\d.-]+)/);
  
  if (!metricsMatch) {
    throw new Error('Could not parse performance metrics from output');
  }

  const totalReturn = parseFloat(metricsMatch[1].replace(/,/g, ''));
  const totalReturnPercentage = parseFloat(metricsMatch[2]);
  const totalTrades = parseInt(metricsMatch[3]);
  const winRate = parseFloat(metricsMatch[4]);
  const averageWin = parseFloat(metricsMatch[5]);
  const averageLoss = parseFloat(metricsMatch[6]);
  const maxDrawdown = parseFloat(metricsMatch[7]);
  const sharpeRatio = parseFloat(metricsMatch[8]);

  // Calculate additional metrics
  const winningTrades = Math.round((winRate / 100) * totalTrades);
  const losingTrades = totalTrades - winningTrades;
  const profitFactor = averageWin > 0 && averageLoss < 0 ? Math.abs(averageWin / averageLoss) : 0;

  return {
    name: testConfig.name,
    description: testConfig.description,
    totalReturn,
    totalReturnPercentage,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    averageWin,
    averageLoss,
    profitFactor,
    maxDrawdown,
    sharpeRatio
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

  if (recommendations.length === 0) {
    recommendations.push('⚠️  No significant improvements found. Consider different parameters or strategies.');
  }

  return recommendations;
}

// Run the tests
testTrailingStopConfigurations().catch(console.error);


