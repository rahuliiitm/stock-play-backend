const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function testPriceActionStrategySequential() {
  console.log('🚀 Testing Price Action Strategy - Sequential Processing');
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

    console.log('\n🔍 Testing sequential processing (last 100 candles)...');
    
    // Process candles sequentially to simulate real trading
    const testCandles = candles.slice(-100); // Last 100 candles
    let totalSignals = 0;
    let entrySignals = 0;
    let exitSignals = 0;
    let lastSignalType = null;
    let lastSignalDirection = null;
    let consecutiveSignals = 0;

    console.log(`📊 Processing ${testCandles.length} candles sequentially...`);
    
    for (let i = 0; i < testCandles.length; i++) {
      const currentCandles = testCandles.slice(0, i + 1);
      
      // Skip if not enough data for indicators
      if (currentCandles.length < Math.max(config.supertrendPeriod, config.macdSlow) + 10) {
        continue;
      }
      
      try {
        const result = await strategy.evaluate(config, currentCandles);
        
        if (result && result.signals && result.signals.length > 0) {
          const signals = result.signals;
          totalSignals += signals.length;
          
          signals.forEach(signal => {
            const time = new Date(signal.timestamp).toISOString().split('T')[0];
            const direction = signal.data.direction || 'N/A';
            const price = signal.data.price?.toFixed(2) || 'N/A';
            
            if (signal.type === 'ENTRY') {
              entrySignals++;
              console.log(`📈 ENTRY: ${direction} @ ₹${price} (${time})`);
              
              // Track consecutive signals
              if (lastSignalType === 'ENTRY' && lastSignalDirection === direction) {
                consecutiveSignals++;
              } else {
                consecutiveSignals = 1;
              }
              lastSignalType = 'ENTRY';
              lastSignalDirection = direction;
              
            } else if (signal.type === 'EXIT') {
              exitSignals++;
              console.log(`📉 EXIT: ${direction} @ ₹${price} (${time})`);
              lastSignalType = 'EXIT';
              lastSignalDirection = direction;
            }
          });
        }
      } catch (error) {
        // Skip errors for insufficient data
        if (!error.message.includes('Insufficient')) {
          console.error(`❌ Error at candle ${i}:`, error.message);
        }
      }
    }

    console.log('\n📊 SEQUENTIAL PROCESSING RESULTS:');
    console.log(`   Total Signals: ${totalSignals}`);
    console.log(`   Entry Signals: ${entrySignals}`);
    console.log(`   Exit Signals: ${exitSignals}`);
    console.log(`   Max Consecutive Same Signals: ${consecutiveSignals}`);
    
    if (totalSignals > 0) {
      console.log('\n✅ Price Action Strategy is working with sequential processing!');
      console.log(`   Strategy generated ${totalSignals} signals across ${testCandles.length} candles`);
      
      if (consecutiveSignals > 1) {
        console.log(`   ⚠️ Found ${consecutiveSignals} consecutive signals of same type - this might indicate the strategy is too sensitive`);
      }
    } else {
      console.log('\n⚠️ No signals generated - strategy may need parameter tuning or different market conditions');
    }

    // Test with a specific date range to see more signals
    console.log('\n🔍 Testing with specific date range (2024 data)...');
    const candles2024 = candles.filter(c => {
      const year = new Date(c.timestamp).getFullYear();
      return year === 2024;
    });
    
    if (candles2024.length > 0) {
      console.log(`📊 Testing with ${candles2024.length} candles from 2024...`);
      
      let signals2024 = 0;
      for (let i = 0; i < candles2024.length; i++) {
        const currentCandles = candles2024.slice(0, i + 1);
        
        if (currentCandles.length < Math.max(config.supertrendPeriod, config.macdSlow) + 10) {
          continue;
        }
        
        try {
          const result = await strategy.evaluate(config, currentCandles);
          if (result && result.signals && result.signals.length > 0) {
            signals2024 += result.signals.length;
            result.signals.forEach(signal => {
              const time = new Date(signal.timestamp).toISOString().split('T')[0];
              const direction = signal.data.direction || 'N/A';
              const price = signal.data.price?.toFixed(2) || 'N/A';
              console.log(`   ${signal.type} ${direction} @ ₹${price} (${time})`);
            });
          }
        } catch (error) {
          // Skip errors
        }
      }
      
      console.log(`📈 2024 signals: ${signals2024}`);
    }

  } catch (error) {
    console.error('❌ Error running price action strategy test:', error);
  }
}

// Run the test
testPriceActionStrategySequential().catch(console.error);
