const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');

async function testEMACrossoverFix() {
  console.log('🔍 Testing EMA Crossover Detection Fix...\n');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const csvDataProvider = app.get('CsvDataProvider');
    const advancedATRStrategy = app.get('AdvancedATRStrategyService');
    
    // Load sample data
    console.log('📊 Loading sample NIFTY data...');
    const candles = await csvDataProvider.getHistoricalCandles('NIFTY', '15m', '2015-01-01T00:00:00.000Z', '2015-02-28T23:59:59.000Z');
    console.log(`✅ Loaded ${candles.length} candles\n`);
    
    if (candles.length < 50) {
      console.log('❌ Insufficient data for testing');
      return;
    }
    
    // Test with minimal configuration to get maximum trades
    const minimalConfig = {
      id: 'test-ema-crossover-fix',
      name: 'Test EMA Crossover Fix',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.002,
      atrRequiredForEntry: false, // DISABLED for initial entries
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 20, // Very loose RSI entry
      rsiEntryShort: 80, // Very loose RSI entry
      rsiExitLong: 30, // Very loose RSI exit
      rsiExitShort: 70, // Very loose RSI exit
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 20, // High max lots
      pyramidingEnabled: true,
      exitMode: 'LIFO',
      misExitTime: null,
      cncExitTime: null,
      maxConsecutiveLosses: 10, // High tolerance
      maxDrawdownStop: 0.2, // High tolerance
      positionSizingMode: 'CONSERVATIVE'
    };
    
    console.log('🧪 Testing EMA Crossover Detection with Minimal Config:');
    console.log(`   📊 RSI Entry: ${minimalConfig.rsiEntryLong}/${minimalConfig.rsiEntryShort}`);
    console.log(`   📊 RSI Exit: ${minimalConfig.rsiExitLong}/${minimalConfig.rsiExitShort}`);
    console.log(`   📊 Max Lots: ${minimalConfig.maxLots}`);
    console.log(`   📊 ATR Required: ${minimalConfig.atrRequiredForEntry}\n`);
    
    // Test with different amounts of data to simulate backtest progression
    const testPoints = [30, 50, 100, 200, 500];
    let totalSignals = 0;
    let crossoverCount = 0;
    
    for (const point of testPoints) {
      if (point > candles.length) continue;
      
      console.log(`\n🔍 Testing at candle ${point}:`);
      const testCandles = candles.slice(0, point);
      const evaluation = advancedATRStrategy.evaluate(minimalConfig, testCandles);
      
      console.log(`   📊 Signals: ${evaluation.signals.length}`);
      console.log(`   📊 CrossedUp: ${evaluation.diagnostics.crossedUp}`);
      console.log(`   📊 CrossedDown: ${evaluation.diagnostics.crossedDown}`);
      console.log(`   📊 Fast EMA: ${evaluation.diagnostics.fast?.toFixed(2)}`);
      console.log(`   📊 Slow EMA: ${evaluation.diagnostics.slow?.toFixed(2)}`);
      console.log(`   📊 Fast Prev: ${evaluation.diagnostics.fastPrev?.toFixed(2)}`);
      console.log(`   📊 Slow Prev: ${evaluation.diagnostics.slowPrev?.toFixed(2)}`);
      
      if (evaluation.diagnostics.crossedUp || evaluation.diagnostics.crossedDown) {
        crossoverCount++;
        console.log(`   🎯 CROSSOVER DETECTED!`);
      }
      
      if (evaluation.diagnostics.reason) {
        console.log(`   ❌ Reason: ${evaluation.diagnostics.reason}`);
        if (evaluation.diagnostics.fastLength) {
          console.log(`   📊 Fast Length: ${evaluation.diagnostics.fastLength}`);
          console.log(`   📊 Slow Length: ${evaluation.diagnostics.slowLength}`);
        }
      }
      
      totalSignals += evaluation.signals.length;
      
      // Show signal details if any
      if (evaluation.signals.length > 0) {
        console.log(`   📊 Signals:`);
        evaluation.signals.forEach((signal, idx) => {
          console.log(`      ${idx + 1}. ${signal.type} ${signal.data.direction} at ${signal.data.price}`);
        });
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   🎯 Total Crossovers Detected: ${crossoverCount}`);
    console.log(`   📊 Total Signals Generated: ${totalSignals}`);
    console.log(`   📊 Average Signals per Test: ${(totalSignals / testPoints.length).toFixed(2)}`);
    
    if (crossoverCount > 0) {
      console.log(`   ✅ EMA Crossover Detection is WORKING!`);
    } else {
      console.log(`   ❌ EMA Crossover Detection is NOT working`);
    }
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testEMACrossoverFix().catch(console.error);


