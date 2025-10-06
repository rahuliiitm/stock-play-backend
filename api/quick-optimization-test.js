const { spawn } = require('child_process');

// Quick optimization test - focus on most impactful changes
const quickTests = [
  {
    name: "Current Config (Baseline)",
    changes: {}
  },
  {
    name: "1 Hour Timeframe",
    changes: {
      timeframe: "1h",
      maxLots: 2
    }
  },
  {
    name: "4 Hour Timeframe", 
    changes: {
      timeframe: "4h",
      maxLots: 1
    }
  },
  {
    name: "EMA 12/26 (Less Sensitive)",
    changes: {
      emaFastPeriod: 12,
      emaSlowPeriod: 26,
      maxLots: 2
    }
  },
  {
    name: "Tighter RSI + Less Lots",
    changes: {
      rsiEntryLong: 40,
      rsiEntryShort: 60,
      maxLots: 2
    }
  }
];

async function runQuickTest(testName, changes) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Testing: ${testName}`);
    
    // Modify the run-optimized-backtest-direct.js temporarily
    const fs = require('fs');
    const originalFile = fs.readFileSync('run-optimized-backtest-direct.js', 'utf8');
    
    // Apply changes to the config
    let modifiedFile = originalFile;
    
    Object.keys(changes).forEach(key => {
      if (key === 'timeframe') {
        modifiedFile = modifiedFile.replace(
          /timeframe: "15m"/g, 
          `timeframe: "${changes[key]}"`
        );
      } else if (key === 'maxLots') {
        modifiedFile = modifiedFile.replace(
          /maxLots: \d+/g,
          `maxLots: ${changes[key]}`
        );
      } else if (key.startsWith('ema')) {
        const period = key.includes('Fast') ? 'emaFastPeriod' : 'emaSlowPeriod';
        const value = changes[key];
        const regex = new RegExp(`${period}: \\d+`, 'g');
        modifiedFile = modifiedFile.replace(regex, `${period}: ${value}`);
      } else if (key.startsWith('rsi')) {
        const value = changes[key];
        const regex = new RegExp(`${key}: \\d+`, 'g');
        modifiedFile = modifiedFile.replace(regex, `${key}: ${value}`);
      }
    });
    
    // Write temporary file
    const tempFile = `temp-backtest-${Date.now()}.js`;
    fs.writeFileSync(tempFile, modifiedFile);
    
    // Run backtest
    const child = spawn('node', [tempFile], {
      cwd: '/Users/rjain/stockplay/stock-play-backend/api',
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
      // Clean up
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      
      if (code !== 0) {
        reject(new Error(`Test failed: ${errorOutput}`));
        return;
      }
      
      // Parse results
      const results = parseResults(output);
      resolve({ name: testName, results });
    });
    
    // Timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Test timeout'));
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
  
  if (totalTradesMatch) results.totalTrades = parseInt(totalTradesMatch[1]);
  if (totalReturnMatch) {
    results.totalReturn = parseFloat(totalReturnMatch[1].replace(/,/g, ''));
    results.totalReturnPercent = parseFloat(totalReturnMatch[2]);
  }
  if (winRateMatch) results.winRate = parseFloat(winRateMatch[1]);
  if (avgWinMatch) results.avgWin = parseFloat(avgWinMatch[1]);
  if (avgLossMatch) results.avgLoss = parseFloat(avgLossMatch[1]);
  
  return results;
}

async function runQuickOptimization() {
  console.log('🚀 Quick Strategy Optimization');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const test of quickTests) {
    try {
      console.log(`\n⏳ Testing: ${test.name}`);
      const result = await runQuickTest(test.name, test.changes);
      results.push(result);
      
      console.log(`✅ ${test.name}:`);
      console.log(`   📈 Trades: ${result.results.totalTrades || 'N/A'}`);
      console.log(`   💰 Return: ${result.results.totalReturnPercent || 'N/A'}%`);
      console.log(`   🎯 Win Rate: ${result.results.winRate || 'N/A'}%`);
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 QUICK OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    const annualized = result.results.totalReturnPercent ? 
      (Math.pow(1 + result.results.totalReturnPercent/100, 1/10) - 1) * 100 : 0;
    
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   📈 Trades: ${result.results.totalTrades || 'N/A'}`);
    console.log(`   💰 Return: ${result.results.totalReturnPercent || 'N/A'}% (${annualized.toFixed(2)}% annualized)`);
    console.log(`   🎯 Win Rate: ${result.results.winRate || 'N/A'}%`);
  });
  
  return results;
}

runQuickOptimization().catch(console.error);


