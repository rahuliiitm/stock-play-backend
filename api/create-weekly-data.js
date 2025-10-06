const fs = require('fs');
const path = require('path');

async function createWeeklyData() {
  console.log('🔄 Creating weekly NIFTY data from 15-minute data...');
  
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
    
    // Group into weekly candles (Monday to Friday)
    const weeklyCandles = [];
    const weeklyMap = new Map();
    
    for (const candle of candles) {
      const date = new Date(candle.timestamp);
      
      // Get the start of the week (Monday)
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days to Monday
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.getTime();
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          timestamp: weekStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        });
      } else {
        const weekly = weeklyMap.get(weekKey);
        weekly.high = Math.max(weekly.high, candle.high);
        weekly.low = Math.min(weekly.low, candle.low);
        weekly.close = candle.close; // Last close of the week
        weekly.volume += candle.volume;
      }
    }
    
    // Convert to array and sort by timestamp
    const weeklyArray = Array.from(weeklyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📊 Created ${weeklyArray.length} weekly candles`);
    
    // Write to CSV
    const outputPath = path.join(__dirname, 'data', 'NIFTY_10year_1w.csv');
    const csvLines = ['timestamp,open,high,low,close,volume'];
    
    for (const candle of weeklyArray) {
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
    console.log(`✅ Created weekly data: ${outputPath}`);
    console.log(`📊 Total weekly candles: ${weeklyArray.length}`);
    
    // Show date range
    if (weeklyArray.length > 0) {
      console.log(`📅 Date range: ${weeklyArray[0].timestamp.toISOString()} to ${weeklyArray[weeklyArray.length - 1].timestamp.toISOString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating weekly data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

createWeeklyData();

