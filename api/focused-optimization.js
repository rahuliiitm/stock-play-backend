const { spawn } = require('child_process');
const fs = require('fs');

// Focused optimization - target the root cause: terrible win rate
const focusedTests = [
  {
    name: "Conservative RSI (30/70)",
    config: {
      rsiEntryLong: 30,    // Only buy when oversold
      rsiEntryShort: 70,   // Only sell when overbought
      rsiExitLong: 60,     // Exit long at 60
      rsiExitShort: 40,    // Exit short at 40
      maxLots: 1,          // Single position
      trailingStopEnabled: false  // Disable for now
    }
  },
  {
    name: "Trend Following (45/55)",
    config: {
      rsiEntryLong: 45,    // Buy on slight weakness
      rsiEntryShort: 55,   // Sell on slight strength
      rsiExitLong: 75,     // Exit long at 75
      rsiExitShort: 25,    // Exit short at 25
      maxLots: 1,
      trailingStopEnabled: false
    }
  },
  {
    name: "Mean Reversion (35/65)",
    config: {
      rsiEntryLong: 35,    // Buy when oversold
      rsiEntryShort: 65,   // Sell when overbought
      rsiExitLong: 50,     // Exit at neutral
      rsiExitShort: 50,   // Exit at neutral
      maxLots: 1,
      trailingStopEnabled: false
    }
  },
  {
    name: "EMA Only (No RSI)",
    config: {
      rsiEntryLong: 0,     // Disable RSI entry
      rsiEntryShort: 0,    // Disable RSI entry
      rsiExitLong: 0,      // Disable RSI exit
      rsiExitShort: 0,     // Disable RSI exit
      maxLots: 1,
      trailingStopEnabled: false
    }
  }
];

async function runFocusedTest(testName, config) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Testing: ${testName}`);
    
    // Create a modified version of the backtest script
    const originalScript = fs.readFileSync('run-optimized-backtest-direct.js', 'utf8');
    
    let modifiedScript = originalScript;
    
    // Apply configuration changes
    Object.keys(config).forEach(key => {
      if (key.startsWith('rsi')) {
        const value = config[key];
        const regex = new RegExp(`${key}: \\d+`, 'g');
        modifiedScript = modifiedScript.replace(regex, `${key}: ${value}`);
      } else if (key === 'maxLots') {
        modifiedScript = modifiedScript.replace(/maxLots: \d+/, `maxLots: ${config[key]}`);
      } else if (key === 'trailingStopEnabled') {
        modifiedScript = modifiedScript.replace(/trailingStopEnabled: (true|false)/, `trailingStopEnabled: ${config[key]}`);
      }
    });
    
    // Write temporary script
    const tempFile = `temp-focused-${Date.now()}.js`;
    fs.writeFileSync(tempFile, modifiedScript);
    
    // Run backtest with timeout
    const child = spawn('node', [tempFile], {
      cwd: '/Users/rjain/stockplay/stock-play-backend/api',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
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
      // Clean up
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      
      if (code !== 0) {
        console.error(`❌ ${testName} failed:`, errorOutput);
        resolve({ name: testName, results: null, error: errorOutput });
        return;
      }
      
      // Parse results
      const results = parseResults(output);
      resolve({ name: testName, results, config });
    });
    
    // Timeout after 3 minutes
    setTimeout(() => {
      child.kill();
      resolve({ name: testName, results: null, error: 'Timeout' });
    }, 180000);
  });
}

function parseResults(output) {
  const results = {};
  
  const totalTradesMatch = output.match(/Total Trades: (\d+)/);
  const totalReturnMatch = output.match(/Total Return: ₹([\d,]+\.?\d*) \(([\d.]+)%\)/);
  const winRateMatch = output.match(/Win Rate: ([\d.]+)%/);
  const avgWinMatch = output.match(/Average Win: ₹([\d.]+)/);
  const avgLossMatch = output.match(/Average Loss: ₹([\d.]+)/);
  const maxDDMatch = output.match(/Max Drawdown: ([\d.]+)%/);
  
  if (totalTradesMatch) results.totalTrades = parseInt(totalTradesMatch[1]);
  if (totalReturnMatch) {
    results.totalReturn = parseFloat(totalReturnMatch[1].replace(/,/g, ''));
    results.totalReturnPercent = parseFloat(totalReturnMatch[2]);
  }
  if (winRateMatch) results.winRate = parseFloat(winRateMatch[1]);
  if (avgWinMatch) results.avgWin = parseFloat(avgWinMatch[1]);
  if (avgLossMatch) results.avgLoss = parseFloat(avgLossMatch[1]);
  if (maxDDMatch) results.maxDrawdown = parseFloat(maxDDMatch[1]);
  
  return results;
}

async function runFocusedOptimization() {
  console.log('🎯 Focused Strategy Optimization');
  console.log('Target: Fix terrible win rate (<0.25%)');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const test of focusedTests) {
    try {
      const result = await runFocusedTest(test.name, test.config);
      results.push(result);
      
      if (result.results) {
        console.log(`✅ ${test.name}:`);
        console.log(`   📈 Trades: ${result.results.totalTrades || 'N/A'}`);
        console.log(`   💰 Return: ${result.results.totalReturnPercent || 'N/A'}%`);
        console.log(`   🎯 Win Rate: ${result.results.winRate || 'N/A'}%`);
        console.log(`   📊 Avg Win: ₹${result.results.avgWin || 'N/A'}`);
        console.log(`   📊 Avg Loss: ₹${result.results.avgLoss || 'N/A'}`);
      } else {
        console.log(`❌ ${test.name}: ${result.error || 'Failed'}`);
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} error:`, error.message);
    }
  }
  
  // Analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 FOCUSED OPTIMIZATION ANALYSIS');
  console.log('='.repeat(80));
  
  const successfulResults = results.filter(r => r.results);
  
  if (successfulResults.length > 0) {
    // Sort by win rate (most important metric)
    successfulResults.sort((a, b) => (b.results.winRate || 0) - (a.results.winRate || 0));
    
    console.log('\n🏆 Results sorted by Win Rate:');
    successfulResults.forEach((result, index) => {
      const annualized = result.results.totalReturnPercent ? 
        (Math.pow(1 + result.results.totalReturnPercent/100, 1/10) - 1) * 100 : 0;
      
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   🎯 Win Rate: ${result.results.winRate || 'N/A'}% (${result.results.winRate > 5 ? '✅ Good' : result.results.winRate > 1 ? '⚠️  Poor' : '❌ Terrible'})`);
      console.log(`   📈 Trades: ${result.results.totalTrades || 'N/A'}`);
      console.log(`   💰 Return: ${result.results.totalReturnPercent || 'N/A'}% (${annualized.toFixed(2)}% annualized)`);
      console.log(`   📊 Risk/Reward: ${result.results.avgWin}/${result.results.avgLoss}`);
    });
    
    // Find best configuration
    const bestResult = successfulResults[0];
    console.log(`\n🏆 BEST CONFIGURATION: ${bestResult.name}`);
    console.log(`   Win Rate: ${bestResult.results.winRate}%`);
    console.log(`   Annualized Return: ${(Math.pow(1 + bestResult.results.totalReturnPercent/100, 1/10) - 1) * 100}%`);
  } else {
    console.log('❌ No successful results to analyze');
  }
  
  return results;
}

runFocusedOptimization().catch(console.error);


