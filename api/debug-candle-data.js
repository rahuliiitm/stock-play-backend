const fs = require('fs');
const path = require('path');

/**
 * Debug candle data to see what's being passed to the strategy
 */
function debugCandleData() {
  console.log('🔍 Debugging candle data...');
  
  // Read the CSV data
  const csvPath = path.join(__dirname, 'data', 'NIFTY_15m.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    return;
  }
  
  console.log('📊 Reading CSV data from:', csvPath);
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log('📊 Total lines:', lines.length);
  console.log('📊 Header:', lines[0]);
  
  // Parse first few candles
  const candles = [];
  for (let i = 1; i < Math.min(10, lines.length); i++) {
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
  
  console.log('\n📊 Sample candles:');
  candles.forEach((candle, index) => {
    console.log(`  ${index + 1}: ${new Date(candle.timestamp).toISOString()} - O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`);
  });
  
  // Test EMA calculation with real data
  const { EMA } = require('technicalindicators');
  
  const closes = candles.map(c => c.close);
  console.log('\n📊 Close values:', closes);
  
  try {
    const ema9 = EMA.calculate({ period: 9, values: closes });
    const ema21 = EMA.calculate({ period: 21, values: closes });
    
    console.log('\n📈 EMA 9 Results:');
    console.log('  Length:', ema9.length);
    console.log('  Values:', ema9);
    
    console.log('\n📈 EMA 21 Results:');
    console.log('  Length:', ema21.length);
    console.log('  Values:', ema21);
    
    if (ema9.length > 0) {
      console.log('  Latest EMA 9:', ema9[ema9.length - 1]);
    }
    if (ema21.length > 0) {
      console.log('  Latest EMA 21:', ema21[ema21.length - 1]);
    }
    
  } catch (error) {
    console.error('❌ EMA calculation error:', error);
  }
}

// Run the debug
debugCandleData();

