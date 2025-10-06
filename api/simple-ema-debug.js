const fs = require('fs');
const path = require('path');

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

// Load and parse CSV data
function loadCSVData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    const headers = lines[0].split(',');
    
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 6) {
        candles.push({
          timestamp: new Date(values[0]).getTime(),
          open: parseFloat(values[1]),
          high: parseFloat(values[2]),
          low: parseFloat(values[3]),
          close: parseFloat(values[4]),
          volume: parseFloat(values[5])
        });
      }
    }
    
    return candles;
  } catch (error) {
    console.error('Error loading CSV:', error.message);
    return [];
  }
}

async function debugEMACrossover() {
  console.log('🔍 Debugging EMA Crossover Detection (Simple Version)...\n');
  
  // Try to load the 10-year data file
  const dataPath = path.join(__dirname, 'data', 'NIFTY_10year_15m.csv');
  console.log(`📊 Looking for data file: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    console.log('❌ 10-year data file not found. Checking for alternative files...');
    
    // Check for other CSV files
    const dataDir = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    console.log(`📁 Available CSV files: ${files.join(', ')}`);
    
    if (files.length === 0) {
      console.log('❌ No CSV files found in data directory');
      return;
    }
    
    // Use the first available CSV file
    const csvFile = path.join(dataDir, files[0]);
    console.log(`📊 Using file: ${csvFile}`);
    
    const candles = loadCSVData(csvFile);
    if (candles.length === 0) {
      console.log('❌ No data loaded');
      return;
    }
    
    console.log(`✅ Loaded ${candles.length} candles from ${files[0]}`);
    console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString()} to ${new Date(candles[candles.length - 1].timestamp).toISOString()}\n`);
    
    // Calculate EMAs
    const closes = candles.map(c => c.close);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    
    console.log('📈 EMA Values (last 10):');
    console.log(`EMA 9:  ${ema9.slice(-10).map(v => v.toFixed(2)).join(', ')}`);
    console.log(`EMA 21: ${ema21.slice(-10).map(v => v.toFixed(2)).join(', ')}\n`);
    
    // Check for crossovers in the last 200 candles
    console.log('🔍 Checking for EMA Crossovers in last 200 candles...');
    let crossoverCount = 0;
    let lastCrossover = null;
    
    const startIndex = Math.max(0, ema9.length - 200);
    for (let i = startIndex; i < ema9.length - 1; i++) {
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
        console.log(`   EMA 21: ${slowPrev.toFixed(2)} → ${slowCurr.toFixed(2)}`);
        console.log(`   Price: ${candles[i + 1].close.toFixed(2)}\n`);
        lastCrossover = { direction, timestamp, index: i + 1 };
      }
    }
    
    console.log(`📊 Total Crossovers Found: ${crossoverCount}`);
    if (lastCrossover) {
      console.log(`📅 Last Crossover: ${lastCrossover.direction} at ${lastCrossover.timestamp}`);
    }
    
    // Check the most recent values
    console.log('\n📊 Most Recent Values:');
    const lastIndex = ema9.length - 1;
    const prevIndex = ema9.length - 2;
    console.log(`Current EMA 9: ${ema9[lastIndex].toFixed(2)}`);
    console.log(`Current EMA 21: ${ema21[lastIndex].toFixed(2)}`);
    console.log(`Previous EMA 9: ${ema9[prevIndex].toFixed(2)}`);
    console.log(`Previous EMA 21: ${ema21[prevIndex].toFixed(2)}`);
    console.log(`Current Price: ${candles[lastIndex].close.toFixed(2)}`);
    console.log(`Current Date: ${new Date(candles[lastIndex].timestamp).toISOString()}`);
    
    // Check if we should have a crossover
    const shouldCrossUp = ema9[prevIndex] <= ema21[prevIndex] && ema9[lastIndex] > ema21[lastIndex];
    const shouldCrossDown = ema9[prevIndex] >= ema21[prevIndex] && ema9[lastIndex] < ema21[lastIndex];
    console.log(`\n🔍 Current Crossover Check:`);
    console.log(`   Should Cross Up: ${shouldCrossUp}`);
    console.log(`   Should Cross Down: ${shouldCrossDown}`);
    
  } else {
    console.log('✅ 10-year data file found');
    // Process the 10-year data
    const candles = loadCSVData(dataPath);
    console.log(`✅ Loaded ${candles.length} candles from 10-year dataset`);
    
    // Calculate EMAs and check for crossovers
    const closes = candles.map(c => c.close);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    
    // Check for crossovers in the entire dataset
    let crossoverCount = 0;
    for (let i = 20; i < ema9.length - 1; i++) {
      const fastPrev = ema9[i];
      const fastCurr = ema9[i + 1];
      const slowPrev = ema21[i];
      const slowCurr = ema21[i + 1];
      
      const crossedUp = fastPrev <= slowPrev && fastCurr > slowCurr;
      const crossedDown = fastPrev >= slowPrev && fastCurr < slowCurr;
      
        if (crossedUp || crossedDown) {
          crossoverCount++;
          if (crossoverCount <= 10) { // Show first 10 crossovers
            const direction = crossedUp ? 'UP' : 'DOWN';
            const timestamp = new Date(candles[i + 1].timestamp);
            const timestampStr = isNaN(timestamp.getTime()) ? 'Invalid Date' : timestamp.toISOString();
            console.log(`🎯 Crossover ${crossoverCount}: ${direction} at ${timestampStr}`);
          }
        }
    }
    
    console.log(`📊 Total Crossovers Found in 10-year dataset: ${crossoverCount}`);
  }
}

debugEMACrossover().catch(console.error);
