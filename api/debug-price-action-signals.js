const fs = require('fs');
const path = require('path');

/**
 * Debug Price Action Strategy Signal Generation
 * 
 * This script focuses on debugging why no trades are being generated
 * by examining the signal generation logic step by step.
 */

// Import the compiled strategy service
const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');

// Mock the StrategyIndicatorsService with more realistic calculations
class MockStrategyIndicatorsService {
  calculateSupertrend(candles, period, multiplier) {
    if (candles.length < period + 10) return null;
    
    // Simple ATR calculation
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // Calculate ATR (simplified)
    let atr = 0;
    for (let i = 1; i < Math.min(period, candles.length); i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i-1]),
        Math.abs(lows[i] - closes[i-1])
      );
      atr += tr;
    }
    atr = atr / Math.min(period, candles.length - 1);
    
    const latestCandle = candles[candles.length - 1];
    const basicUpperBand = (highs.slice(-period).reduce((a, b) => a + b, 0) / period) + (multiplier * atr);
    const basicLowerBand = (lows.slice(-period).reduce((a, b) => a + b, 0) / period) - (multiplier * atr);
    
    const supertrend = latestCandle.close > basicUpperBand ? basicLowerBand : basicUpperBand;
    const isBullish = latestCandle.close > supertrend;
    
    return {
      supertrend: supertrend,
      isBullish,
      isBearish: !isBullish,
      trendDirection: isBullish ? 'UPTREND' : 'DOWNTREND'
    };
  }

  calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod) {
    if (candles.length < slowPeriod + signalPeriod) return null;
    
    const closes = candles.map(c => c.close);
    
    // Simple EMA calculation
    function calculateEMA(values, period) {
      const multiplier = 2 / (period + 1);
      let ema = values[0];
      for (let i = 1; i < values.length; i++) {
        ema = (values[i] * multiplier) + (ema * (1 - multiplier));
      }
      return ema;
    }
    
    const fastEMA = calculateEMA(closes.slice(-fastPeriod), fastPeriod);
    const slowEMA = calculateEMA(closes.slice(-slowPeriod), slowPeriod);
    const macd = fastEMA - slowEMA;
    
    // Simple signal line (EMA of MACD)
    const signal = macd * 0.9; // Simplified signal calculation
    const isBullish = macd > signal;
    
    return {
      macd: macd,
      signal: signal,
      isBullish,
      isBearish: !isBullish
    };
  }
}

async function debugPriceActionSignals() {
  console.log('🔍 Debugging Price Action Strategy Signal Generation');
  console.log('='.repeat(60));

  try {
    // Create strategy instance with mock indicators service
    const mockIndicatorsService = new MockStrategyIndicatorsService();
    const strategy = new PriceActionStrategyService(mockIndicatorsService);

    // Strategy configuration
    const config = {
      id: 'price-action-debug',
      name: 'Price Action Strategy Debug',
      symbol: 'NIFTY',
      timeframe: '1d',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
      atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    };

    console.log('\n📊 Strategy Configuration:');
    console.log(`   Supertrend: ${config.supertrendPeriod} periods, ${config.supertrendMultiplier}x multiplier`);
    console.log(`   MACD: ${config.macdFast}/${config.macdSlow}/${config.macdSignal}`);

    // Load NIFTY daily data
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvFile = path.join(dataDir, 'NIFTY_10year_1d.csv');
    
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
          timeframe: '1d'
        });
      }
    }

    console.log(`   Loaded ${candles.length} candles`);
    console.log(`   Date range: ${new Date(candles[0].timestamp).toISOString().split('T')[0]} to ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Test with a smaller subset for debugging
    const testCandles = candles.slice(-100); // Last 100 candles
    console.log(`\n🧪 Testing with last ${testCandles.length} candles for debugging`);

    let signalCount = 0;
    let entrySignals = 0;
    let exitSignals = 0;

    // Process each candle and examine signals
    for (let i = 0; i < testCandles.length; i++) {
      const currentCandles = testCandles.slice(0, i + 1);
      
      try {
        const evaluation = await strategy.evaluate(config, currentCandles);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          signalCount++;
          
          for (const signal of evaluation.signals) {
            const date = new Date(signal.timestamp).toISOString().split('T')[0];
            const price = signal.data.price.toFixed(2);
            const direction = signal.data.direction;
            
            if (signal.type === 'ENTRY') {
              entrySignals++;
              console.log(`   📈 ${direction} ENTRY: ${date} @ ₹${price}`);
            } else if (signal.type === 'EXIT') {
              exitSignals++;
              console.log(`   📉 ${direction} EXIT: ${date} @ ₹${price}`);
            }
          }
        }
        
        // Show detailed evaluation for first few signals
        if (signalCount <= 3 && evaluation && evaluation.signals && evaluation.signals.length > 0) {
          console.log(`\n🔍 Detailed Evaluation for Signal ${signalCount}:`);
          console.log(`   Candle: ${new Date(testCandles[i].timestamp).toISOString().split('T')[0]}`);
          console.log(`   Close: ₹${testCandles[i].close.toFixed(2)}`);
          console.log(`   Signals: ${evaluation.signals.length}`);
          evaluation.signals.forEach((signal, idx) => {
            console.log(`     ${idx + 1}. ${signal.type} ${signal.data.direction} @ ₹${signal.data.price.toFixed(2)}`);
          });
        }
        
      } catch (error) {
        console.error(`   ❌ Error at candle ${i + 1}: ${error.message}`);
      }
    }

    console.log('\n📊 Signal Analysis:');
    console.log(`   Total Signals: ${signalCount}`);
    console.log(`   Entry Signals: ${entrySignals}`);
    console.log(`   Exit Signals: ${exitSignals}`);
    
    if (signalCount === 0) {
      console.log('\n❌ No signals generated! This indicates an issue with:');
      console.log('   1. Indicator calculations');
      console.log('   2. Signal generation logic');
      console.log('   3. State machine implementation');
      console.log('   4. Entry/exit conditions');
      
      // Let's test the indicators directly
      console.log('\n🧪 Testing Indicators Directly:');
      const testCandlesForIndicators = testCandles.slice(-50);
      
      const supertrendResult = mockIndicatorsService.calculateSupertrend(
        testCandlesForIndicators, 
        config.supertrendPeriod, 
        config.supertrendMultiplier
      );
      
      const macdResult = mockIndicatorsService.calculateMACD(
        testCandlesForIndicators, 
        config.macdFast, 
        config.macdSlow, 
        config.macdSignal
      );
      
      console.log(`   Supertrend Result: ${supertrendResult ? '✅' : '❌'}`);
      if (supertrendResult) {
        console.log(`     Value: ${supertrendResult.supertrend.toFixed(2)}`);
        console.log(`     Bullish: ${supertrendResult.isBullish}`);
      }
      
      console.log(`   MACD Result: ${macdResult ? '✅' : '❌'}`);
      if (macdResult) {
        console.log(`     MACD: ${macdResult.macd.toFixed(4)}`);
        console.log(`     Signal: ${macdResult.signal.toFixed(4)}`);
        console.log(`     Bullish: ${macdResult.isBullish}`);
      }
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugPriceActionSignals().catch(console.error);
