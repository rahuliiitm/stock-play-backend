#!/usr/bin/env node

/**
 * Large Dataset Preparation Script
 * 
 * This script prepares the large NIFTY dataset for comprehensive backtesting
 * by ensuring proper data quality and creating optimized configurations.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';
const LARGE_DATASET_DIR = path.join(DATA_DIR, 'large');

async function analyzeDataset() {
  console.log('📊 Analyzing NIFTY dataset...');
  
  const csvPath = path.join(DATA_DIR, 'NIFTY_15m.csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error('NIFTY_15m.csv not found');
  }
  
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.trim().split('\n');
  const candles = lines.slice(1).map(line => {
    const [timestamp, open, high, low, close, volume] = line.split(',');
    return {
      timestamp: parseInt(timestamp),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseInt(volume)
    };
  });
  
  console.log(`📈 Total candles: ${candles.length}`);
  
  const startDate = new Date(candles[0].timestamp);
  const endDate = new Date(candles[candles.length - 1].timestamp);
  
  console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  console.log(`⏱️  Duration: ${Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))} days`);
  
  // Analyze price movements
  const priceChanges = candles.slice(1).map((candle, i) => {
    const prevClose = candles[i].close;
    return ((candle.close - prevClose) / prevClose) * 100;
  });
  
  const avgChange = priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / priceChanges.length;
  const maxChange = Math.max(...priceChanges.map(Math.abs));
  
  console.log(`📊 Average price change: ${avgChange.toFixed(3)}%`);
  console.log(`📊 Maximum price change: ${maxChange.toFixed(3)}%`);
  
  // Check for gaps
  const gaps = candles.slice(1).filter((candle, i) => {
    const prevClose = candles[i].close;
    const gap = Math.abs(candle.open - prevClose) / prevClose;
    return gap > 0.01; // 1% gap
  });
  
  console.log(`📊 Significant gaps (>1%): ${gaps.length}`);
  
  return {
    totalCandles: candles.length,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration: Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)),
    avgChange,
    maxChange,
    gaps: gaps.length
  };
}

async function createOptimizedConfigs() {
  console.log('\n⚙️  Creating optimized backtest configurations...');
  
  const configs = {
    // Full dataset test
    fullDataset: {
      name: 'Full Dataset Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'full-dataset',
        name: 'Full Dataset EMA-Gap-ATR',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.6,
        atrMultiplierUnwind: 0.3,
        strongCandleThreshold: 0.1,
        gapUpDownThreshold: 0.3,
        rsiPeriod: 14,
        rsiEntryLong: 48,
        rsiEntryShort: 52,
        rsiExitLong: 45,
        rsiExitShort: 55,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    },
    
    // Monthly tests
    monthlyTests: [
      {
        name: 'October 2024',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-10-31T23:59:59.000Z'
      },
      {
        name: 'November 2024',
        startDate: '2024-11-01T00:00:00.000Z',
        endDate: '2024-11-30T23:59:59.000Z'
      },
      {
        name: 'December 2024',
        startDate: '2024-12-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z'
      },
      {
        name: 'January 2025',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.000Z'
      },
      {
        name: 'February 2025',
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-28T23:59:59.000Z'
      },
      {
        name: 'March 2025',
        startDate: '2025-03-01T00:00:00.000Z',
        endDate: '2025-03-31T23:59:59.000Z'
      },
      {
        name: 'April 2025',
        startDate: '2025-04-01T00:00:00.000Z',
        endDate: '2025-04-30T23:59:59.000Z'
      },
      {
        name: 'May 2025',
        startDate: '2025-05-01T00:00:00.000Z',
        endDate: '2025-05-31T23:59:59.000Z'
      },
      {
        name: 'June 2025',
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-06-30T23:59:59.000Z'
      },
      {
        name: 'July 2025',
        startDate: '2025-07-01T00:00:00.000Z',
        endDate: '2025-07-25T23:59:59.000Z'
      }
    ],
    
    // Quarterly tests
    quarterlyTests: [
      {
        name: 'Q4 2024',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z'
      },
      {
        name: 'Q1 2025',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-03-31T23:59:59.000Z'
      },
      {
        name: 'Q2 2025',
        startDate: '2025-04-01T00:00:00.000Z',
        endDate: '2025-06-30T23:59:59.000Z'
      },
      {
        name: 'Q3 2025 (Partial)',
        startDate: '2025-07-01T00:00:00.000Z',
        endDate: '2025-07-25T23:59:59.000Z'
      }
    ]
  };
  
  // Save configurations
  const configPath = path.join(LARGE_DATASET_DIR, 'backtest-configs.json');
  fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
  
  console.log(`✅ Configurations saved to ${configPath}`);
  
  return configs;
}

async function createBacktestScript() {
  console.log('\n📝 Creating comprehensive backtest script...');
  
  const scriptContent = `#!/usr/bin/env node

/**
 * Large Dataset Backtest Runner
 * 
 * This script runs comprehensive backtests on the large NIFTY dataset
 * to evaluate strategy performance across different time periods and configurations.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:20003';
const CONFIG_PATH = path.join(__dirname, 'backtest-configs.json');

// Load configurations
const configs = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

async function runBacktest(config) {
  try {
    console.log(\`\\n🚀 Running \${config.name}...\`);
    
    const startTime = Date.now();
    const response = await axios.post(\`\${BASE_URL}/backtest/run\`, config);
    const endTime = Date.now();
    
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(\`✅ \${config.name} completed in \${duration}s\`);
    console.log(\`📊 Results:\`);
    console.log(\`   Total Return: \${response.data.totalReturnPercentage.toFixed(2)}%\`);
    console.log(\`   Total Trades: \${response.data.trades.length}\`);
    console.log(\`   Final Balance: ₹\${response.data.finalBalance.toLocaleString()}\`);
    
    if (response.data.trades.length > 0) {
      const winningTrades = response.data.trades.filter(t => t.pnl > 0);
      const losingTrades = response.data.trades.filter(t => t.pnl < 0);
      const winRate = (winningTrades.length / response.data.trades.length * 100).toFixed(1);
      
      console.log(\`   Win Rate: \${winRate}%\`);
      console.log(\`   Winning Trades: \${winningTrades.length}\`);
      console.log(\`   Losing Trades: \${losingTrades.length}\`);
      
      if (winningTrades.length > 0) {
        const avgWin = (winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length).toFixed(2);
        console.log(\`   Average Win: ₹\${avgWin}\`);
      }
      
      if (losingTrades.length > 0) {
        const avgLoss = (losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length).toFixed(2);
        console.log(\`   Average Loss: ₹\${avgLoss}\`);
      }
    }
    
    return {
      name: config.name,
      duration: parseFloat(duration),
      results: response.data
    };
    
  } catch (error) {
    console.error(\`❌ \${config.name} failed:\`, error.response?.data?.message || error.message);
    return {
      name: config.name,
      error: error.response?.data?.message || error.message
    };
  }
}

async function main() {
  console.log('🎯 Large Dataset EMA-Gap-ATR Strategy Backtesting');
  console.log('=' .repeat(60));
  
  // Check if server is running
  try {
    await axios.get(\`\${BASE_URL}/healthz\`);
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('Run: cd /Users/rjain/stockplay/stock-play-backend/api && npm start');
    process.exit(1);
  }
  
  const results = [];
  
  // Run full dataset test
  console.log('\\n📈 Running Full Dataset Test...');
  const fullResult = await runBacktest(configs.fullDataset);
  results.push(fullResult);
  
  // Run monthly tests
  console.log('\\n📅 Running Monthly Tests...');
  for (const month of configs.monthlyTests) {
    const config = {
      ...configs.fullDataset,
      name: \`Monthly Test - \${month.name}\`,
      startDate: month.startDate,
      endDate: month.endDate
    };
    
    const result = await runBacktest(config);
    results.push(result);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Run quarterly tests
  console.log('\\n📊 Running Quarterly Tests...');
  for (const quarter of configs.quarterlyTests) {
    const config = {
      ...configs.fullDataset,
      name: \`Quarterly Test - \${quarter.name}\`,
      startDate: quarter.startDate,
      endDate: quarter.endDate
    };
    
    const result = await runBacktest(config);
    results.push(result);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\\n📊 COMPREHENSIVE BACKTEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successfulResults = results.filter(r => !r.error);
  const failedResults = results.filter(r => r.error);
  
  console.log(\`✅ Successful Tests: \${successfulResults.length}\`);
  console.log(\`❌ Failed Tests: \${failedResults.length}\`);
  
  if (successfulResults.length > 0) {
    console.log('\\n🏆 Best Performing Periods:');
    const sortedResults = successfulResults
      .filter(r => r.results && r.results.totalReturnPercentage !== undefined)
      .sort((a, b) => b.results.totalReturnPercentage - a.results.totalReturnPercentage);
    
    sortedResults.slice(0, 5).forEach((result, index) => {
      console.log(\`   \${index + 1}. \${result.name}: \${result.results.totalReturnPercentage.toFixed(2)}%\`);
    });
  }
  
  console.log('\\n🎯 Large Dataset Backtesting Complete!');
}

main().catch(console.error);
`;

  const scriptPath = path.join(LARGE_DATASET_DIR, 'run-large-backtest.js');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  
  console.log(`✅ Backtest script created: ${scriptPath}`);
}

async function main() {
  try {
    console.log('🎯 Preparing Large Dataset for Comprehensive Backtesting');
    console.log('=' .repeat(60));
    
    // Create large dataset directory
    if (!fs.existsSync(LARGE_DATASET_DIR)) {
      fs.mkdirSync(LARGE_DATASET_DIR, { recursive: true });
    }
    
    // Analyze dataset
    const analysis = await analyzeDataset();
    
    // Create optimized configurations
    const configs = await createOptimizedConfigs();
    
    // Create backtest script
    await createBacktestScript();
    
    console.log('\n✅ Large dataset preparation complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: cd /Users/rjain/stockplay/stock-play-backend/api && npm start');
    console.log('2. Run comprehensive backtest: node scripts/run-comprehensive-backtest.js');
    console.log('3. Run large dataset backtest: node data/large/run-large-backtest.js');
    
  } catch (error) {
    console.error('❌ Error preparing large dataset:', error.message);
    process.exit(1);
  }
}

main();
