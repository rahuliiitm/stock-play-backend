const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');

async function debugEMACrossover() {
  console.log('🔍 Debugging EMA Crossover Detection...\n');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const csvDataProvider = app.get('CsvDataProvider');
    const advancedATRStrategy = app.get('AdvancedATRStrategyService');
    
    // Load 10-year data
    console.log('📊 Loading 10-year NIFTY data...');
    const candles = await csvDataProvider.getHistoricalCandles('NIFTY', '15m', '2014-01-01T00:00:00.000Z', '2024-12-31T23:59:59.000Z');
    console.log(`✅ Loaded ${candles.length} candles\n`);
    
    if (candles.length < 100) {
      console.log('❌ Insufficient data for analysis');
      return;
    }
    
    // Test EMA calculation manually
    console.log('🧮 Testing EMA Calculation...');
    const closes = candles.map(c => c.close);
    
    // Calculate EMAs manually using simple method
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    
    console.log(`📈 EMA 9 values: ${ema9.slice(-5).map(v => v.toFixed(2)).join(', ')}`);
    console.log(`📈 EMA 21 values: ${ema21.slice(-5).map(v => v.toFixed(2)).join(', ')}\n`);
    
    // Check for crossovers in the last 100 candles
    console.log('🔍 Checking for EMA Crossovers in last 100 candles...');
    let crossoverCount = 0;
    let lastCrossover = null;
    
    for (let i = Math.max(0, ema9.length - 100); i < ema9.length - 1; i++) {
      const fastPrev = ema9[i];
      const fastCurr = ema9[i + 1];
      const slowPrev = ema21[i];
      const slowCurr = ema21[i + 1];
      
      const crossedUp = fastPrev <= slowPrev && fastCurr > slowCurr;
      const crossedDown = fastPrev >= slowPrev && fastCurr < slowCurr;
      
      if (crossedUp || crossedDown) {
        crossoverCount++;
        const direction = crossedUp ? 'UP' : 'DOWN';
        const timestamp = new Date(candles[i + 1].timestamp).toISOString();
        console.log(`🎯 Crossover ${crossoverCount}: ${direction} at ${timestamp}`);
        console.log(`   EMA 9: ${fastPrev.toFixed(2)} → ${fastCurr.toFixed(2)}`);
        console.log(`   EMA 21: ${slowPrev.toFixed(2)} → ${slowCurr.toFixed(2)}\n`);
        lastCrossover = { direction, timestamp, index: i + 1 };
      }
    }
    
    console.log(`📊 Total Crossovers Found: ${crossoverCount}`);
    if (lastCrossover) {
      console.log(`📅 Last Crossover: ${lastCrossover.direction} at ${lastCrossover.timestamp}`);
    }
    
    // Test the strategy service directly
    console.log('\n🧪 Testing Strategy Service...');
    const testConfig = {
      id: 'test-ema-crossover',
      name: 'Test EMA Crossover',
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
    
    // Test with last 50 candles
    const testCandles = candles.slice(-50);
    const evaluation = advancedATRStrategy.evaluate(testConfig, testCandles);
    
    console.log('📊 Strategy Evaluation Results:');
    console.log(`   Signals: ${evaluation.signals.length}`);
    console.log(`   CrossedUp: ${evaluation.diagnostics.crossedUp}`);
    console.log(`   CrossedDown: ${evaluation.diagnostics.crossedDown}`);
    console.log(`   Fast EMA: ${evaluation.diagnostics.fast?.toFixed(2)}`);
    console.log(`   Slow EMA: ${evaluation.diagnostics.slow?.toFixed(2)}`);
    console.log(`   Fast Prev: ${evaluation.diagnostics.fastPrev?.toFixed(2)}`);
    console.log(`   Slow Prev: ${evaluation.diagnostics.slowPrev?.toFixed(2)}`);
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Simple EMA calculation
function calculateEMA(values, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // First value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    ema[i] = (values[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

debugEMACrossover().catch(console.error);


