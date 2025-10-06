const fs = require('fs');
const path = require('path');

// Read weekly data
const weeklyData = fs.readFileSync('data/NIFTY_10year_1w.csv', 'utf8');
const lines = weeklyData.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

console.log(`Processing ${dataLines.length} weekly candles...`);

// Group by month
const monthlyData = {};
const monthlyCandles = [];

for (const line of dataLines) {
  const [timestamp, open, high, low, close, volume] = line.split(',');
  const date = new Date(timestamp);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  if (!monthlyData[monthKey]) {
    monthlyData[monthKey] = {
      timestamp: timestamp,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
      count: 1
    };
  } else {
    // Aggregate monthly data
    monthlyData[monthKey].high = Math.max(monthlyData[monthKey].high, parseFloat(high));
    monthlyData[monthKey].low = Math.min(monthlyData[monthKey].low, parseFloat(low));
    monthlyData[monthKey].close = parseFloat(close); // Use last close of month
    monthlyData[monthKey].volume += parseFloat(volume);
    monthlyData[monthKey].count++;
  }
}

// Convert to array and sort by timestamp
for (const monthKey of Object.keys(monthlyData).sort()) {
  const data = monthlyData[monthKey];
  monthlyCandles.push({
    timestamp: data.timestamp,
    open: data.open,
    high: data.high,
    low: data.low,
    close: data.close,
    volume: data.volume
  });
}

// Write monthly data
const csvContent = [
  'timestamp,open,high,low,close,volume',
  ...monthlyCandles.map(candle => 
    `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume}`
  )
].join('\n');

fs.writeFileSync('data/NIFTY_10year_1m.csv', csvContent);

console.log(`✅ Created monthly data: ${monthlyCandles.length} monthly candles`);
console.log(`📅 Date range: ${monthlyCandles[0].timestamp} to ${monthlyCandles[monthlyCandles.length-1].timestamp}`);


