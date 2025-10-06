const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');

/**
 * Test API Data Provider Configuration
 * 
 * This script tests the same CsvDataProvider that the API server uses
 * to identify why it's not loading data in the API context.
 */
async function testApiDataProvider() {
  console.log('🧪 Testing API Data Provider Configuration...\n');
  
  // Set environment variables like the API server would
  process.env.DATA_PROVIDER_MODE = 'csv';
  process.env.CSV_DATA_DIR = './data';
  
  console.log('📊 Environment Variables:');
  console.log(`   DATA_PROVIDER_MODE: ${process.env.DATA_PROVIDER_MODE}`);
  console.log(`   CSV_DATA_DIR: ${process.env.CSV_DATA_DIR}`);
  console.log(`   Current working directory: ${process.cwd()}\n`);
  
  const provider = new CsvDataProvider();
  
  // Test with the same parameters as our API request
  const startDate = new Date('2024-01-01T00:00:00.000Z');
  const endDate = new Date('2024-06-30T23:59:59.000Z');
  
  console.log('📅 API Request Parameters:');
  console.log(`   Symbol: NIFTY`);
  console.log(`   Timeframe: 15m`);
  console.log(`   Start: ${startDate.toISOString()}`);
  console.log(`   End: ${endDate.toISOString()}\n`);
  
  try {
    console.log('🔍 Testing data loading...');
    const candles = await provider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
    
    console.log(`✅ Success! Loaded ${candles.length} candles`);
    
    if (candles.length > 0) {
      console.log('\n📊 First candle:', {
        timestamp: candles[0].timestamp,
        date: new Date(candles[0].timestamp).toISOString(),
        open: candles[0].open,
        high: candles[0].high,
        low: candles[0].low,
        close: candles[0].close,
        volume: candles[0].volume
      });
      
      console.log('\n📊 Last candle:', {
        timestamp: candles[candles.length - 1].timestamp,
        date: new Date(candles[candles.length - 1].timestamp).toISOString(),
        open: candles[candles.length - 1].open,
        high: candles[candles.length - 1].high,
        low: candles[candles.length - 1].low,
        close: candles[candles.length - 1].close,
        volume: candles[candles.length - 1].volume
      });
      
      console.log('\n📈 Data Summary:');
      console.log(`   📊 Total candles: ${candles.length}`);
      console.log(`   📅 Date range: ${new Date(candles[0].timestamp).toISOString()} to ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
      console.log(`   💰 Price range: ${Math.min(...candles.map(c => c.low)).toFixed(2)} to ${Math.max(...candles.map(c => c.high)).toFixed(2)}`);
      
    } else {
      console.log('❌ No candles loaded - this explains the API error');
      console.log('🔍 Debugging data provider...');
      
      // Check if files exist
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = path.join(process.cwd(), 'data');
      const csvFile = path.join(dataDir, 'NIFTY_15m.csv');
      
      console.log(`\n📁 File System Check:`);
      console.log(`   Data directory: ${dataDir}`);
      console.log(`   Data directory exists: ${fs.existsSync(dataDir)}`);
      console.log(`   CSV file: ${csvFile}`);
      console.log(`   CSV file exists: ${fs.existsSync(csvFile)}`);
      
      if (fs.existsSync(csvFile)) {
        const stats = fs.statSync(csvFile);
        console.log(`   CSV file size: ${stats.size} bytes`);
        console.log(`   CSV file modified: ${stats.mtime}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error loading data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testApiDataProvider();

