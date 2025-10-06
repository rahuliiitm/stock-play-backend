const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function debugStrategyEvaluation() {
  console.log('🔍 Debugging Strategy Evaluation');
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
    
    // Test with enough candles for Supertrend calculation
    const testCandles = candles.slice(0, 50); // Use 50 candles to ensure we have valid Supertrend values
    
    console.log('\n🔧 Testing strategy evaluation...');
    
    const config = {
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
    };

    const result = await strategy.evaluate(config, testCandles);
    
    console.log('\n📊 Strategy Evaluation Result:');
    console.log(`Signals: ${result.signals.length}`);
    console.log(`Diagnostics:`, result.diagnostics);
    
    if (result.signals.length > 0) {
      console.log('\n📊 Signals:');
      result.signals.forEach((signal, i) => {
        console.log(`${i + 1}. ${signal.type} ${signal.data.direction} @ ₹${signal.data.price}`);
        console.log(`   Supertrend: ${signal.data.metadata.supertrend}`);
        console.log(`   MACD: ${signal.data.metadata.macd}`);
        console.log(`   Timestamp: ${signal.timestamp}`);
      });
    }

  } catch (error) {
    console.error('❌ Error debugging strategy evaluation:', error);
  }
}

debugStrategyEvaluation().catch(console.error);