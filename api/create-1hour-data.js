const fs = require('fs');
const path = require('path');

async function create1HourData() {
  console.log('🔄 Creating 1-hour NIFTY data from 15-minute data...');
  
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
    
    // Group into 1-hour candles
    const hourlyCandles = [];
    const hourlyMap = new Map();
    
    for (const candle of candles) {
      const hour = new Date(candle.timestamp);
      hour.setMinutes(0, 0, 0); // Round down to hour
      const hourKey = hour.getTime();
      
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, {
          timestamp: hour,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        });
      } else {
        const hourly = hourlyMap.get(hourKey);
        hourly.high = Math.max(hourly.high, candle.high);
        hourly.low = Math.min(hourly.low, candle.low);
        hourly.close = candle.close; // Last close of the hour
        hourly.volume += candle.volume;
      }
    }
    
    // Convert to array and sort by timestamp
    const hourlyArray = Array.from(hourlyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📊 Created ${hourlyArray.length} hourly candles`);
    
    // Write to CSV
    const outputPath = path.join(__dirname, 'data', 'NIFTY_10year_1h.csv');
    const csvLines = ['timestamp,open,high,low,close,volume'];
    
    for (const candle of hourlyArray) {
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
    console.log(`✅ Created 1-hour data: ${outputPath}`);
    console.log(`📊 Total hourly candles: ${hourlyArray.length}`);
    
    // Show date range
    if (hourlyArray.length > 0) {
      console.log(`📅 Date range: ${hourlyArray[0].timestamp.toISOString()} to ${hourlyArray[hourlyArray.length - 1].timestamp.toISOString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating 1-hour data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

create1HourData();