const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');

async function testEMAFix() {
  console.log('🧪 Testing EMA Fix...\n');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const csvDataProvider = app.get('CsvDataProvider');
    const advancedATRStrategy = app.get('AdvancedATRStrategyService');
    
    // Load a small sample of data
    console.log('📊 Loading sample NIFTY data...');
    const candles = await csvDataProvider.getHistoricalCandles('NIFTY', '15m', '2015-01-01T00:00:00.000Z', '2015-01-31T23:59:59.000Z');
    console.log(`✅ Loaded ${candles.length} candles\n`);
    
    if (candles.length < 50) {
      console.log('❌ Insufficient data for testing');
      return;
    }
    
    // Test with different amounts of data
    const testConfig = {
      id: 'test-ema-fix',
      name: 'Test EMA Fix',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.002,
      atrRequiredForEntry: false,
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 30,
      rsiEntryShort: 70,
      rsiExitLong: 35,
      rsiExitShort: 65,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 12,
      pyramidingEnabled: true,
      exitMode: 'LIFO',
      misExitTime: null,
      cncExitTime: null,
      maxConsecutiveLosses: 3,
      maxDrawdownStop: 0.1,
      positionSizingMode: 'CONSERVATIVE'
    };
    
    // Test with different amounts of data
    const testSizes = [10, 20, 30, 50];
    
    for (const size of testSizes) {
      console.log(`\n🧪 Testing with ${size} candles:`);
      const testCandles = candles.slice(0, size);
      const evaluation = advancedATRStrategy.evaluate(testConfig, testCandles);
      
      console.log(`   📊 Signals: ${evaluation.signals.length}`);
      console.log(`   📊 CrossedUp: ${evaluation.diagnostics.crossedUp}`);
      console.log(`   📊 CrossedDown: ${evaluation.diagnostics.crossedDown}`);
      console.log(`   📊 Fast EMA: ${evaluation.diagnostics.fast?.toFixed(2)}`);
      console.log(`   📊 Slow EMA: ${evaluation.diagnostics.slow?.toFixed(2)}`);
      console.log(`   📊 Fast Prev: ${evaluation.diagnostics.fastPrev?.toFixed(2)}`);
      console.log(`   📊 Slow Prev: ${evaluation.diagnostics.slowPrev?.toFixed(2)}`);
      
      if (evaluation.diagnostics.reason) {
        console.log(`   ❌ Reason: ${evaluation.diagnostics.reason}`);
        if (evaluation.diagnostics.fastLength) {
          console.log(`   📊 Fast Length: ${evaluation.diagnostics.fastLength}`);
          console.log(`   📊 Slow Length: ${evaluation.diagnostics.slowLength}`);
        }
      }
    }
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEMAFix().catch(console.error);