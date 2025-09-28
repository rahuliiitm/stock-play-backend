const fs = require('fs');

/**
 * Analyze EMA crossover frequency in the sample datasets
 */
async function analyzeCrossoverFrequency() {
  console.log('🔍 Analyzing EMA crossover frequency in sample datasets...');
  
  const samples = [
    { name: '2015 Early Market', file: 'data/NIFTY_2015_sample.csv' },
    { name: '2018 Pre-COVID', file: 'data/NIFTY_2018_sample.csv' },
    { name: '2020 COVID Crash', file: 'data/NIFTY_2020_covid.csv' },
    { name: '2021 Recovery', file: 'data/NIFTY_2021_recovery.csv' },
    { name: '2024 Recent', file: 'data/NIFTY_2024_recent.csv' }
  ];
  
  for (const sample of samples) {
    console.log(`\n📊 Analyzing ${sample.name}...`);
    
    if (!fs.existsSync(sample.file)) {
      console.log(`❌ File not found: ${sample.file}`);
      continue;
    }
    
    const data = fs.readFileSync(sample.file, 'utf8');
    const lines = data.trim().split('\n');
    
    console.log(`📈 Total candles: ${lines.length - 1}`);
    
    // Parse candles
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const [timestamp, open, high, low, close, volume] = lines[i].split(',');
      candles.push({
        timestamp: parseInt(timestamp),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume)
      });
    }
    
    // Calculate EMAs
    const emaFast = calculateEMA(candles, 9);
    const emaSlow = calculateEMA(candles, 21);
    
    console.log(`📊 EMA Fast (9): ${emaFast.length} values`);
    console.log(`📊 EMA Slow (21): ${emaSlow.length} values`);
    
    if (emaFast.length < 2 || emaSlow.length < 2) {
      console.log(`⚠️  Insufficient EMA data for crossover analysis`);
      continue;
    }
    
    // Find crossovers
    let crossovers = 0;
    let bullishCrossovers = 0;
    let bearishCrossovers = 0;
    
    for (let i = 1; i < Math.min(emaFast.length, emaSlow.length); i++) {
      const fastCurrent = emaFast[i];
      const fastPrev = emaFast[i - 1];
      const slowCurrent = emaSlow[i];
      const slowPrev = emaSlow[i - 1];
      
      // Bullish crossover: fast crosses above slow
      if (fastPrev <= slowPrev && fastCurrent > slowCurrent) {
        bullishCrossovers++;
        crossovers++;
        console.log(`🟢 Bullish crossover at ${new Date(candles[i].timestamp).toISOString()}: Fast=${fastCurrent.toFixed(2)}, Slow=${slowCurrent.toFixed(2)}`);
      }
      
      // Bearish crossover: fast crosses below slow
      if (fastPrev >= slowPrev && fastCurrent < slowCurrent) {
        bearishCrossovers++;
        crossovers++;
        console.log(`🔴 Bearish crossover at ${new Date(candles[i].timestamp).toISOString()}: Fast=${fastCurrent.toFixed(2)}, Slow=${slowCurrent.toFixed(2)}`);
      }
    }
    
    console.log(`📊 Crossover Summary:`);
    console.log(`   🟢 Bullish crossovers: ${bullishCrossovers}`);
    console.log(`   🔴 Bearish crossovers: ${bearishCrossovers}`);
    console.log(`   📈 Total crossovers: ${crossovers}`);
    console.log(`   📊 Crossover frequency: ${(crossovers / (candles.length / 100)).toFixed(2)} per 100 candles`);
    
    if (crossovers === 0) {
      console.log(`⚠️  NO CROSSOVERS FOUND! This explains why no trades are generated.`);
      
      // Show EMA values for debugging
      console.log(`📊 EMA Values (last 10):`);
      const start = Math.max(0, emaFast.length - 10);
      for (let i = start; i < emaFast.length; i++) {
        const candle = candles[i];
        console.log(`   ${new Date(candle.timestamp).toISOString()}: Fast=${emaFast[i].toFixed(2)}, Slow=${emaSlow[i].toFixed(2)}, Close=${candle.close}`);
      }
    }
  }
}

/**
 * Calculate EMA for given period
 */
function calculateEMA(candles, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  ema.push(sum / period);
  
  // Calculate EMA for remaining values
  for (let i = period; i < candles.length; i++) {
    const currentEMA = (candles[i].close * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEMA);
  }
  
  return ema;
}

// Run the analysis
analyzeCrossoverFrequency().catch(error => {
  console.error('❌ Analysis failed:', error);
});
