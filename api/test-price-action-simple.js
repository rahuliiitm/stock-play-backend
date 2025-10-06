const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function testPriceActionStrategy() {
  console.log('🚀 Testing Price Action Strategy with Supertrend(10,2) + MACD');
  console.log('='.repeat(60));

  try {
    // Create strategy instance directly
    const strategy = new PriceActionStrategyService();

    // Read NIFTY data
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvPath = path.join(dataDir, 'NIFTY_10year_1d.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Data file not found: ${csvPath}`);
      return;
    }

    console.log(`📊 Reading data from: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Parse CSV data
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
          timeframe: '1d'
        });
      }
    }

    console.log(`📈 Loaded ${candles.length} candles`);
    console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString().split('T')[0]} to ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Test configuration
    const config = {
      id: 'price-action-test',
      name: 'Price Action Strategy Test',
      symbol: 'NIFTY',
      timeframe: '1d',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
      atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    };

    console.log('\n🔍 Testing strategy evaluation...');
    
    // Test with different candle windows
    const testWindows = [50, 100, 200, 500];
    let totalSignals = 0;
    let entrySignals = 0;
    let exitSignals = 0;

    for (const windowSize of testWindows) {
      if (windowSize > candles.length) continue;
      
      const testCandles = candles.slice(-windowSize);
      console.log(`\n📊 Testing with ${windowSize} candles...`);
      
      try {
        const result = await strategy.evaluate(config, testCandles);
        
        if (result && result.signals) {
          const signals = result.signals;
          totalSignals += signals.length;
          
          const entryCount = signals.filter(s => s.type === 'ENTRY').length;
          const exitCount = signals.filter(s => s.type === 'EXIT').length;
          
          entrySignals += entryCount;
          exitSignals += exitCount;
          
          console.log(`   ✅ Generated ${signals.length} signals (${entryCount} entries, ${exitCount} exits)`);
          
          if (signals.length > 0) {
            console.log('   📋 Sample signals:');
            signals.slice(0, 3).forEach((signal, index) => {
              const time = new Date(signal.timestamp).toISOString().split('T')[0];
              console.log(`      ${index + 1}. ${signal.type} ${signal.data.direction || 'N/A'} @ ₹${signal.data.price?.toFixed(2) || 'N/A'} (${time})`);
            });
          }
        } else {
          console.log(`   ⚠️ No signals generated`);
        }
      } catch (error) {
        console.error(`   ❌ Error with ${windowSize} candles:`, error.message);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   Total Signals: ${totalSignals}`);
    console.log(`   Entry Signals: ${entrySignals}`);
    console.log(`   Exit Signals: ${exitSignals}`);
    
    if (totalSignals > 0) {
      console.log('\n✅ Price Action Strategy is working!');
      console.log(`   Strategy generated ${totalSignals} signals across different time windows`);
    } else {
      console.log('\n⚠️ No signals generated - strategy may need parameter tuning');
    }

    // Test with full dataset
    console.log('\n🔍 Testing with full dataset...');
    try {
      const fullResult = await strategy.evaluate(config, candles);
      if (fullResult && fullResult.signals) {
        console.log(`📈 Full dataset result: ${fullResult.signals.length} signals`);
        
        if (fullResult.signals.length > 0) {
          console.log('\n📋 Recent signals:');
          fullResult.signals.slice(-5).forEach((signal, index) => {
            const time = new Date(signal.timestamp).toISOString().split('T')[0];
            console.log(`   ${index + 1}. ${signal.type} ${signal.data.direction || 'N/A'} @ ₹${signal.data.price?.toFixed(2) || 'N/A'} (${time})`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error with full dataset:', error.message);
    }

  } catch (error) {
    console.error('❌ Error running price action strategy test:', error);
  }
}

// Run the test
testPriceActionStrategy().catch(console.error);
