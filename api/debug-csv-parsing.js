const fs = require('fs');
const csv = require('csv-parser');

async function debugCsvParsing() {
  console.log('🔍 Debugging CSV parsing...');
  
  try {
    const filePath = '/Users/rjain/stockplay/stock-play-backend/api/data/NIFTY_10year_1d.csv';
    const startDate = new Date('2023-01-01T00:00:00.000Z');
    const endDate = new Date('2023-12-31T23:59:59.000Z');
    
    console.log('📊 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    console.log('');
    
    let rowCount = 0;
    let matchingRows = 0;
    const candles = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          if (rowCount <= 5) {
            console.log(`📄 Row ${rowCount}:`, row);
          }
          
          // Handle both string dates and numeric timestamps
          let timestamp;
          if (row.timestamp) {
            // If timestamp is a number (Unix timestamp in ms)
            const timestampNum = parseFloat(row.timestamp);
            if (!isNaN(timestampNum) && timestampNum > 1000000000000) { // Valid Unix timestamp in ms
              timestamp = timestampNum;
            } else {
              // If timestamp is a date string
              timestamp = new Date(row.timestamp).getTime();
            }
          } else if (row.date) {
            timestamp = new Date(row.date).getTime();
          } else {
            return; // Skip invalid rows
          }

          const candleDate = new Date(timestamp);
          
          if (rowCount <= 5) {
            console.log(`   Parsed timestamp: ${timestamp}`);
            console.log(`   Parsed date: ${candleDate.toISOString()}`);
            console.log(`   In range: ${candleDate >= startDate && candleDate <= endDate}`);
            console.log('');
          }

          if (candleDate >= startDate && candleDate <= endDate) {
            matchingRows++;
            candles.push({
              timestamp,
              open: parseFloat(row.open),
              high: parseFloat(row.high),
              low: parseFloat(row.low),
              close: parseFloat(row.close),
              volume: parseFloat(row.volume || 0),
            });
          }
        })
        .on('end', () => {
          console.log(`📊 Total rows processed: ${rowCount}`);
          console.log(`📊 Matching rows: ${matchingRows}`);
          console.log(`📊 Candles found: ${candles.length}`);
          
          if (candles.length > 0) {
            console.log('📅 First candle:', candles[0]);
            console.log('📅 Last candle:', candles[candles.length - 1]);
          }
          
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ CSV parsing error:', error);
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('❌ Error debugging CSV parsing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugCsvParsing();
