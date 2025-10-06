const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const { StrategyIndicatorsService } = require('./dist/src/modules/strategy/indicators/strategy-indicators.service');
const fs = require('fs');
const path = require('path');

async function runSimplePriceActionTest() {
  console.log('🚀 Price Action Strategy - Simple Test (Fixed)');
  console.log('='.repeat(70));

  try {
    // Create instances manually (bypassing NestJS DI for testing)
    const indicatorsService = new StrategyIndicatorsService();
    const strategy = new PriceActionStrategyService(indicatorsService);

    // Strategy configuration
    const config = {
      id: 'price-action-test',
      name: 'Price Action Strategy with Supertrend(10,2) and MACD',
      symbol: 'NIFTY',
      timeframe: '1w',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
      atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    };

    console.log('\n📊 Strategy Configuration:');
    console.log(`   Strategy: ${config.name}`);
    console.log(`   Symbol: ${config.symbol}`);
    console.log(`   Timeframe: ${config.timeframe}`);
    console.log(`   Supertrend: ${config.supertrendPeriod} periods, ${config.supertrendMultiplier}x multiplier`);
    console.log(`   ATR: ${config.atrPeriod} periods`);
    console.log(`   MACD: ${config.macdFast}/${config.macdSlow}/${config.macdSignal}`);

    // Load NIFTY data
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvFile = path.join(dataDir, 'NIFTY_10year_1w.csv');
    
    if (!fs.existsSync(csvFile)) {
      console.error(`❌ Data file not found: ${csvFile}`);
      return;
    }

    console.log(`\n📈 Loading data from: ${csvFile}`);
    
    const csvData = fs.readFileSync(csvFile, 'utf8');
    const lines = csvData.trim().split('\n');
    const candles = [];

    // Parse CSV data
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

    console.log(`   Loaded ${candles.length} candles`);
    console.log(`   Date range: ${new Date(candles[0].timestamp).toISOString().split('T')[0]} to ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Test with a small subset of data
    const testCandles = candles.slice(-50); // Last 50 candles
    console.log(`\n🧪 Testing with last ${testCandles.length} candles`);

    // Test strategy evaluation
    console.log('\n🎯 Testing Strategy Evaluation...');
    
    let totalSignals = 0;
    let processedCandles = 0;
    
    for (let i = 0; i < testCandles.length; i++) {
      const currentCandles = testCandles.slice(0, i + 1);
      
      try {
        const evaluation = await strategy.evaluate(config, currentCandles);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          totalSignals++;
          for (const signal of evaluation.signals) {
            console.log(`   📊 Signal ${totalSignals}: ${signal.type} ${signal.direction} @ ₹${signal.price} (${new Date(signal.timestamp).toISOString().split('T')[0]})`);
          }
        }
        processedCandles++;
        
      } catch (error) {
        console.error(`   ❌ Error at candle ${i + 1}: ${error.message}`);
      }
    }

    console.log('\n📊 Test Results:');
    console.log(`   Total Signals: ${totalSignals}`);
    console.log(`   Processed Candles: ${processedCandles}`);
    console.log(`   Signal Rate: ${(totalSignals / processedCandles * 100).toFixed(2)}%`);

    if (totalSignals > 0) {
      console.log('\n✅ Strategy is working! Signals are being generated.');
    } else {
      console.log('\n⚠️  No signals generated. This might be normal depending on market conditions.');
    }

  } catch (error) {
    console.error('❌ Error running simple price action test:', error);
    console.error('Stack trace:', error.stack);
  }
}

runSimplePriceActionTest().catch(console.error);
