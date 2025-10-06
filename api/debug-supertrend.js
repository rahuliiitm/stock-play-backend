const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function debugSupertrend() {
  console.log('🔍 Debugging Supertrend Calculation');
  console.log('='.repeat(50));

  try {
    const strategy = new PriceActionStrategyService();

    // Read NIFTY weekly data
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

    console.log(`📈 Loaded ${candles.length} weekly candles`);
    
    // Test with just first 20 candles
    const testCandles = candles.slice(0, 20);
    console.log('\n📊 First 10 candles:');
    testCandles.slice(0, 10).forEach((candle, i) => {
      console.log(`${i}: ${new Date(candle.timestamp).toISOString().split('T')[0]} | H:${candle.high} L:${candle.low} C:${candle.close}`);
    });

    // Test Supertrend calculation directly
    console.log('\n🔧 Testing Supertrend calculation...');
    
    // Access private method for testing
    const supertrend = strategy.calculateSupertrend(testCandles, 10, 2.0, 14);
    
    console.log('\n📊 Supertrend Results:');
    supertrend.forEach((st, i) => {
      const candle = testCandles[i];
      console.log(`${i}: ${new Date(candle.timestamp).toISOString().split('T')[0]} | ST: ${st} | Close: ${candle.close}`);
    });

    // Test ATR calculation
    console.log('\n🔧 Testing ATR calculation...');
    const highs = testCandles.map(c => c.high);
    const lows = testCandles.map(c => c.low);
    const closes = testCandles.map(c => c.close);
    
    const atr = strategy.calculateATR(highs, lows, closes, 14);
    
    console.log('\n📊 ATR Results:');
    atr.forEach((atrVal, i) => {
      const candle = testCandles[i];
      console.log(`${i}: ${new Date(candle.timestamp).toISOString().split('T')[0]} | ATR: ${atrVal}`);
    });

  } catch (error) {
    console.error('❌ Error debugging Supertrend:', error);
  }
}

debugSupertrend().catch(console.error);
