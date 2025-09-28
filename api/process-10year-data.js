const fs = require('fs');
const path = require('path');

/**
 * Process 1-minute NIFTY data and convert to 15-minute candles for backtesting
 */
async function process10YearData() {
  console.log('🔄 Processing 10-year NIFTY data...');
  
  const inputFile = 'data/NIFTY_10year_1min.csv';
  const outputFile = 'data/NIFTY_10year_15m.csv';
  
  if (!fs.existsSync(inputFile)) {
    console.error('❌ Input file not found:', inputFile);
    return;
  }
  
  console.log('📊 Reading 1-minute data...');
  const data = fs.readFileSync(inputFile, 'utf8');
  const lines = data.trim().split('\n');
  
  console.log(`📈 Total 1-minute candles: ${lines.length - 1}`);
  
  // Parse CSV data
  const candles = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, open, high, low, close, volume] = lines[i].split(',');
    
    // Convert date to timestamp
    const timestamp = new Date(date).getTime();
    
    candles.push({
      timestamp,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume)
    });
  }
  
  console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString()} to ${new Date(candles[candles.length-1].timestamp).toISOString()}`);
  
  // Group into 15-minute candles
  console.log('🔄 Converting to 15-minute candles...');
  const candles15m = [];
  const intervalMs = 15 * 60 * 1000; // 15 minutes in milliseconds
  
  let currentCandle = null;
  let currentInterval = null;
  
  for (const candle of candles) {
    // Round timestamp to nearest 15-minute interval
    const intervalStart = Math.floor(candle.timestamp / intervalMs) * intervalMs;
    
    if (currentInterval !== intervalStart) {
      // Save previous candle if exists
      if (currentCandle) {
        candles15m.push(currentCandle);
      }
      
      // Start new candle
      currentCandle = {
        timestamp: intervalStart,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      };
      currentInterval = intervalStart;
    } else {
      // Update current candle
      currentCandle.high = Math.max(currentCandle.high, candle.high);
      currentCandle.low = Math.min(currentCandle.low, candle.low);
      currentCandle.close = candle.close; // Last close in the interval
      currentCandle.volume += candle.volume;
    }
  }
  
  // Add the last candle
  if (currentCandle) {
    candles15m.push(currentCandle);
  }
  
  console.log(`📊 Generated ${candles15m.length} 15-minute candles`);
  console.log(`📅 15m range: ${new Date(candles15m[0].timestamp).toISOString()} to ${new Date(candles15m[candles15m.length-1].timestamp).toISOString()}`);
  
  // Write to CSV
  console.log('💾 Writing 15-minute data...');
  const csvContent = [
    'timestamp,open,high,low,close,volume',
    ...candles15m.map(c => `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`)
  ].join('\n');
  
  fs.writeFileSync(outputFile, csvContent);
  
  console.log(`✅ 15-minute data saved to: ${outputFile}`);
  console.log(`📊 Data points: ${candles15m.length}`);
  
  // Show sample data
  console.log('\n📋 Sample 15-minute candles:');
  console.log('First 3 candles:');
  for (let i = 0; i < Math.min(3, candles15m.length); i++) {
    const c = candles15m[i];
    console.log(`${new Date(c.timestamp).toISOString()}: O=${c.open} H=${c.high} L=${c.low} C=${c.close} V=${c.volume}`);
  }
  
  console.log('\nLast 3 candles:');
  for (let i = Math.max(0, candles15m.length - 3); i < candles15m.length; i++) {
    const c = candles15m[i];
    console.log(`${new Date(c.timestamp).toISOString()}: O=${c.open} H=${c.high} L=${c.low} C=${c.close} V=${c.volume}`);
  }
  
  return {
    totalCandles: candles15m.length,
    startDate: new Date(candles15m[0].timestamp),
    endDate: new Date(candles15m[candles15m.length-1].timestamp),
    outputFile
  };
}

// Run the processing
process10YearData().then(result => {
  console.log('\n🎉 Data processing completed!');
  console.log(`📊 Total 15-minute candles: ${result.totalCandles}`);
  console.log(`📅 Date range: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}`);
  console.log(`📁 Output file: ${result.outputFile}`);
}).catch(error => {
  console.error('❌ Error processing data:', error);
});
