const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function testWarmupPeriod() {
  console.log('🔧 Testing Warm-up Period Implementation');
  console.log('='.repeat(50));

  try {
    const strategy = new PriceActionStrategyService();

    // Test different configurations
    const configs = [
      {
        name: 'Default Config',
        config: {
          id: 'test',
          name: 'test',
          symbol: 'NIFTY',
          timeframe: '1w',
          supertrendPeriod: 10,
          supertrendMultiplier: 2.0,
          atrPeriod: 14,
          macdFast: 12,
          macdSlow: 26,
          macdSignal: 9,
        }
      },
      {
        name: 'Sensitive Config',
        config: {
          id: 'test',
          name: 'test',
          symbol: 'NIFTY',
          timeframe: '1w',
          supertrendPeriod: 7,
          supertrendMultiplier: 1.5,
          atrPeriod: 10,
          macdFast: 8,
          macdSlow: 21,
          macdSignal: 5,
        }
      },
      {
        name: 'Conservative Config',
        config: {
          id: 'test',
          name: 'test',
          symbol: 'NIFTY',
          timeframe: '1w',
          supertrendPeriod: 20,
          supertrendMultiplier: 3.0,
          atrPeriod: 20,
          macdFast: 12,
          macdSlow: 50,
          macdSignal: 12,
        }
      }
    ];

    for (const testCase of configs) {
      console.log(`\n📊 Testing: ${testCase.name}`);
      console.log(`   ST: ${testCase.config.supertrendPeriod}, ATR: ${testCase.config.atrPeriod}`);
      console.log(`   MACD: ${testCase.config.macdFast}, ${testCase.config.macdSlow}, ${testCase.config.macdSignal}`);
      
      const warmupPeriod = strategy.getWarmupPeriod(testCase.config);
      console.log(`   ✅ Warm-up Period: ${warmupPeriod} candles`);
      
      // Calculate what this means in time
      const timeframe = testCase.config.timeframe;
      let timeDescription = '';
      if (timeframe === '1w') {
        timeDescription = `${warmupPeriod} weeks (${(warmupPeriod / 52).toFixed(1)} years)`;
      } else if (timeframe === '1d') {
        timeDescription = `${warmupPeriod} days (${(warmupPeriod / 252).toFixed(1)} years)`;
      } else if (timeframe === '1h') {
        timeDescription = `${warmupPeriod} hours (${(warmupPeriod / 24).toFixed(1)} days)`;
      } else {
        timeDescription = `${warmupPeriod} candles`;
      }
      
      console.log(`   📅 Time equivalent: ${timeDescription}`);
    }

    // Test with actual data to see the impact
    console.log(`\n🔍 Testing with actual data...`);
    
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvPath = path.join(dataDir, 'NIFTY_10year_1w.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Data file not found: ${csvPath}`);
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 6) {
        candles.push({
          symbol: 'NIFTY',
          timestamp: new Date(values[0]).getTime(),
          open: parseFloat(values[1]),
          high: parseFloat(values[2]),
          low: parseFloat(values[3]),
          close: parseFloat(values[4]),
          volume: parseFloat(values[5]) || 0,
          timeframe: '1w'
        });
      }
    }

    console.log(`📈 Total candles available: ${candles.length}`);
    
    const defaultConfig = configs[0].config;
    const warmupPeriod = strategy.getWarmupPeriod(defaultConfig);
    
    console.log(`⏳ Warm-up period: ${warmupPeriod} candles`);
    console.log(`📊 Usable candles for backtesting: ${candles.length - warmupPeriod}`);
    console.log(`📅 Start date: ${new Date(candles[0].timestamp).toISOString().split('T')[0]}`);
    console.log(`📅 Warm-up end date: ${new Date(candles[warmupPeriod - 1].timestamp).toISOString().split('T')[0]}`);
    console.log(`📅 Backtest start date: ${new Date(candles[warmupPeriod].timestamp).toISOString().split('T')[0]}`);
    console.log(`📅 End date: ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);
    
    const warmupWeeks = warmupPeriod;
    const totalWeeks = candles.length;
    const usableWeeks = totalWeeks - warmupPeriod;
    const warmupPercentage = (warmupWeeks / totalWeeks * 100).toFixed(1);
    
    console.log(`\n📊 Impact Analysis:`);
    console.log(`   Warm-up: ${warmupWeeks} weeks (${warmupPercentage}% of data)`);
    console.log(`   Usable: ${usableWeeks} weeks (${(100 - warmupPercentage).toFixed(1)}% of data)`);
    
    if (warmupPercentage > 20) {
      console.log(`   ⚠️  Warning: Warm-up period is ${warmupPercentage}% of total data!`);
      console.log(`   💡 Consider using longer historical data or shorter indicator periods.`);
    } else {
      console.log(`   ✅ Warm-up period is reasonable (${warmupPercentage}% of data)`);
    }

  } catch (error) {
    console.error('❌ Error testing warm-up period:', error);
  }
}

testWarmupPeriod().catch(console.error);
