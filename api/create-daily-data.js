const fs = require('fs');
const path = require('path');

async function createDailyData() {
  console.log('🔄 Creating daily NIFTY data from 15-minute data...');
  
  try {
    // Read 15-minute data
    const csvPath = path.join(__dirname, 'data', 'NIFTY_10year_15m.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`📊 Loaded ${lines.length} lines from 15m data`);
    
    // Parse CSV data
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const [timestamp, open, high, low, close, volume] = lines[i].split(',');
      
      // Parse timestamp more robustly
      let parsedTimestamp;
      if (timestamp.includes('T')) {
        parsedTimestamp = new Date(timestamp);
      } else {
        // Handle different timestamp formats
        parsedTimestamp = new Date(parseInt(timestamp));
      }
      
      // Skip invalid timestamps
      if (isNaN(parsedTimestamp.getTime())) {
        console.log(`⚠️ Skipping invalid timestamp: ${timestamp}`);
        continue;
      }
      
      candles.push({
        timestamp: parsedTimestamp,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseInt(volume) || 0
      });
    }
    
    console.log(`📊 Parsed ${candles.length} candles`);
    
    // Group into daily candles
    const dailyCandles = [];
    const dailyMap = new Map();
    
    for (const candle of candles) {
      const day = new Date(candle.timestamp);
      day.setHours(0, 0, 0, 0); // Round down to day
      const dayKey = day.getTime();
      
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          timestamp: day,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        });
      } else {
        const daily = dailyMap.get(dayKey);
        daily.high = Math.max(daily.high, candle.high);
        daily.low = Math.min(daily.low, candle.low);
        daily.close = candle.close; // Last close of the day
        daily.volume += candle.volume;
      }
    }
    
    // Convert to array and sort by timestamp
    const dailyArray = Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📊 Created ${dailyArray.length} daily candles`);
    
    // Write to CSV
    const outputPath = path.join(__dirname, 'data', 'NIFTY_10year_1d.csv');
    const csvLines = ['timestamp,open,high,low,close,volume'];
    
    for (const candle of dailyArray) {
      csvLines.push([
        candle.timestamp.toISOString(),
        candle.open.toFixed(2),
        candle.high.toFixed(2),
        candle.low.toFixed(2),
        candle.close.toFixed(2),
        candle.volume.toString()
      ].join(','));
    }
    
    fs.writeFileSync(outputPath, csvLines.join('\n'));
    console.log(`✅ Created daily data: ${outputPath}`);
    console.log(`📊 Total daily candles: ${dailyArray.length}`);
    
    // Show date range
    if (dailyArray.length > 0) {
      console.log(`📅 Date range: ${dailyArray[0].timestamp.toISOString()} to ${dailyArray[dailyArray.length - 1].timestamp.toISOString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating daily data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

createDailyData();


