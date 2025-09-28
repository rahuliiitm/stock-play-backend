const fs = require('fs');
const path = require('path');

// Simple test to debug strategy evaluation
async function debugStrategyEvaluation() {
  console.log('🔍 Debugging Strategy Evaluation...');
  
  try {
    // Load CSV data
    const csvPath = path.join(__dirname, 'data', 'NIFTY_15m.csv');
    console.log(`📁 Loading data from: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    console.log(`📊 Total lines in CSV: ${lines.length}`);
    
    // Parse CSV data
    const headers = lines[0].split(',');
    console.log('📋 Headers:', headers);
    
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 6) {
        candles.push({
          timestamp: parseInt(values[0]),
          open: parseFloat(values[1]),
          high: parseFloat(values[2]),
          low: parseFloat(values[3]),
          close: parseFloat(values[4]),
          volume: parseFloat(values[5])
        });
      }
    }
    
    console.log(`📈 Parsed ${candles.length} candles`);
    console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString()} to ${new Date(candles[candles.length-1].timestamp).toISOString()}`);
    
    // Test with last 100 candles
    const testCandles = candles.slice(-100);
    console.log(`🧪 Testing with last ${testCandles.length} candles`);
    
    // Simple EMA calculation test
    const closes = testCandles.map(c => c.close);
    console.log(`💰 Close prices range: ${Math.min(...closes).toFixed(2)} - ${Math.max(...closes).toFixed(2)}`);
    
    // Calculate simple EMAs
    const emaFastPeriod = 9;
    const emaSlowPeriod = 21;
    
    // Simple EMA calculation
    function calculateEMA(values, period) {
      const ema = [];
      const multiplier = 2 / (period + 1);
      
      // Start with SMA for first value
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
    
    const fastEMA = calculateEMA(closes, emaFastPeriod);
    const slowEMA = calculateEMA(closes, emaSlowPeriod);
    
    console.log(`📊 Fast EMA (${emaFastPeriod}): ${fastEMA.slice(-5).map(v => v.toFixed(2)).join(', ')}`);
    console.log(`📊 Slow EMA (${emaSlowPeriod}): ${slowEMA.slice(-5).map(v => v.toFixed(2)).join(', ')}`);
    
    // Check for crossovers
    let crossovers = [];
    for (let i = 1; i < fastEMA.length; i++) {
      const fastPrev = fastEMA[i-1];
      const fastCurr = fastEMA[i];
      const slowPrev = slowEMA[i-1];
      const slowCurr = slowEMA[i];
      
      // Bullish crossover
      if (fastPrev <= slowPrev && fastCurr > slowCurr) {
        crossovers.push({
          type: 'BULLISH',
          index: i,
          timestamp: testCandles[i].timestamp,
          fastEMA: fastCurr,
          slowEMA: slowCurr,
          price: testCandles[i].close
        });
      }
      
      // Bearish crossover
      if (fastPrev >= slowPrev && fastCurr < slowCurr) {
        crossovers.push({
          type: 'BEARISH',
          index: i,
          timestamp: testCandles[i].timestamp,
          fastEMA: fastCurr,
          slowEMA: slowCurr,
          price: testCandles[i].close
        });
      }
    }
    
    console.log(`🔄 Found ${crossovers.length} crossovers:`);
    crossovers.forEach((crossover, idx) => {
      console.log(`  ${idx + 1}. ${crossover.type} at ${new Date(crossover.timestamp).toISOString()} - Price: ${crossover.price.toFixed(2)}, Fast: ${crossover.fastEMA.toFixed(2)}, Slow: ${crossover.slowEMA.toFixed(2)}`);
    });
    
    // Test ATR calculation
    function calculateATR(highs, lows, closes, period) {
      const tr = [];
      for (let i = 1; i < highs.length; i++) {
        const hl = highs[i] - lows[i];
        const hc = Math.abs(highs[i] - closes[i-1]);
        const lc = Math.abs(lows[i] - closes[i-1]);
        tr.push(Math.max(hl, hc, lc));
      }
      
      const atr = [];
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += tr[i];
      }
      atr[period - 1] = sum / period;
      
      for (let i = period; i < tr.length; i++) {
        atr[i] = ((atr[i-1] * (period - 1)) + tr[i]) / period;
      }
      
      return atr;
    }
    
    const highs = testCandles.map(c => c.high);
    const lows = testCandles.map(c => c.low);
    const atrPeriod = 14;
    const atr = calculateATR(highs, lows, closes, atrPeriod);
    
    console.log(`📏 ATR (${atrPeriod}): ${atr.slice(-5).map(v => v.toFixed(2)).join(', ')}`);
    
    // Calculate GapNorm for crossovers
    crossovers.forEach((crossover, idx) => {
      const atrIndex = crossover.index;
      if (atrIndex >= atrPeriod - 1) {
        const currentATR = atr[atrIndex];
        const gapAbs = Math.abs(crossover.fastEMA - crossover.slowEMA);
        const gapNorm = currentATR > 0 ? gapAbs / currentATR : 0;
        
        console.log(`  ${idx + 1}. GapNorm: ${gapNorm.toFixed(4)} (ATR: ${currentATR.toFixed(2)}, Gap: ${gapAbs.toFixed(2)})`);
      }
    });
    
    console.log('\n✅ Strategy evaluation debug completed!');
    
  } catch (error) {
    console.error('❌ Error during strategy evaluation debug:', error);
  }
}

debugStrategyEvaluation();
