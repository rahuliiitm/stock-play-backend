const { spawn } = require('child_process');
const fs = require('fs');

// Strategy Optimization Configuration
const optimizationConfigs = [
  // 1. Reduce EMA sensitivity (wider periods)
  {
    name: "EMA 12/26 (Less Sensitive)",
    config: {
      emaFastPeriod: 12,
      emaSlowPeriod: 26,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 70,
      rsiExitShort: 30,
      trailingStopEnabled: true,
      trailingStopActivationProfit: 0.005, // 0.5%
      maxLots: 3, // Reduce max positions
    }
  },
  
  // 2. Higher timeframe (1 hour)
  {
    name: "1 Hour Timeframe",
    config: {
      timeframe: "1h",
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 70,
      rsiExitShort: 30,
      trailingStopEnabled: true,
      trailingStopActivationProfit: 0.01, // 1%
      maxLots: 2,
    }
  },
  
  // 3. Tighter RSI thresholds (higher quality signals)
  {
    name: "Tighter RSI (40/60)",
    config: {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      rsiEntryLong: 40,
      rsiEntryShort: 60,
      rsiExitLong: 70,
      rsiExitShort: 30,
      trailingStopEnabled: true,
      trailingStopActivationProfit: 0.01,
      maxLots: 2,
    }
  },
  
  // 4. Conservative approach (4 hour timeframe)
  {
    name: "4 Hour Conservative",
    config: {
      timeframe: "4h",
      emaFastPeriod: 12,
      emaSlowPeriod: 26,
      rsiEntryLong: 45,
      rsiEntryShort: 55,
      rsiExitLong: 75,
      rsiExitShort: 25,
      trailingStopEnabled: true,
      trailingStopActivationProfit: 0.02, // 2%
      maxLots: 1, // Single position only
    }
  },
  
  // 5. Trend-following with ADX filter
  {
    name: "ADX Filter (Trend Only)",
    config: {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 70,
      rsiExitShort: 30,
      adxThreshold: 25, // Only trade in trending markets
      trailingStopEnabled: true,
      trailingStopActivationProfit: 0.015, // 1.5%
      maxLots: 2,
    }
  }
];

// Function to run backtest with specific config
async function runBacktest(configName, config) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Testing: ${configName}`);
    console.log(`📋 Config:`, JSON.stringify(config, null, 2));
    
    // Create temporary config file
    const configFile = `temp-config-${Date.now()}.js`;
    const configContent = `
const config = ${JSON.stringify(config, null, 2)};
module.exports = config;
`;
    
    fs.writeFileSync(configFile, configContent);
    
    // Run backtest
    const child = spawn('node', ['run-optimized-backtest-direct.js'], {
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
      // Clean up temp file
      try {
        fs.unlinkSync(configFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (code !== 0) {
        reject(new Error(`Backtest failed with code ${code}: ${errorOutput}`));
        return;
      }
      
      // Parse results
      const results = parseBacktestResults(output);
      resolve({
        name: configName,
        config: config,
        results: results
      });
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill();
      reject(new Error('Backtest timeout'));
    }, 300000);
  });
}

// Function to parse backtest results
function parseBacktestResults(output) {
  const results = {};
  
  // Extract key metrics using regex
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

// Main optimization function
async function optimizeStrategy() {
  console.log('🚀 Starting Strategy Parameter Optimization');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testConfig of optimizationConfigs) {
    try {
      console.log(`\n⏳ Running optimization test: ${testConfig.name}`);
      const result = await runBacktest(testConfig.name, testConfig.config);
      results.push(result);
      
      // Display quick results
      console.log(`✅ ${testConfig.name} Results:`);
      console.log(`   📈 Trades: ${result.results.totalTrades || 'N/A'}`);
      console.log(`   💰 Return: ${result.results.totalReturnPercent || 'N/A'}%`);
      console.log(`   🎯 Win Rate: ${result.results.winRate || 'N/A'}%`);
      
    } catch (error) {
      console.error(`❌ Failed to test ${testConfig.name}:`, error.message);
    }
  }
  
  // Generate optimization report
  console.log('\n' + '='.repeat(80));
  console.log('📊 OPTIMIZATION RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  // Sort by total return percentage
  results.sort((a, b) => (b.results.totalReturnPercent || 0) - (a.results.totalReturnPercent || 0));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   📈 Total Trades: ${result.results.totalTrades || 'N/A'}`);
    console.log(`   💰 Total Return: ${result.results.totalReturnPercent || 'N/A'}%`);
    console.log(`   🎯 Win Rate: ${result.results.winRate || 'N/A'}%`);
    console.log(`   📊 Avg Win: ₹${result.results.avgWin || 'N/A'}`);
    console.log(`   📊 Avg Loss: ₹${result.results.avgLoss || 'N/A'}`);
    console.log(`   📉 Max DD: ${result.results.maxDrawdown || 'N/A'}%`);
    
    // Calculate annualized return
    if (result.results.totalReturnPercent) {
      const annualized = Math.pow(1 + result.results.totalReturnPercent/100, 1/10) - 1;
      console.log(`   📅 Annualized: ${(annualized * 100).toFixed(2)}%`);
    }
  });
  
  // Save detailed results
  const reportFile = `optimization-results-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${reportFile}`);
  
  return results;
}

// Run optimization
optimizeStrategy().catch(console.error);


