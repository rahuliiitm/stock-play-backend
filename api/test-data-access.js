const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');

/**
 * Test CSV data access to verify files can be loaded
 */
async function testDataAccess() {
  console.log('🧪 Testing CSV data access...');
  
  const provider = new CsvDataProvider();
  
  // Test with the same date range as our backtest
  const startDate = new Date('2024-01-01T00:00:00.000Z');
  const endDate = new Date('2024-06-30T23:59:59.000Z');
  
  console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
  console.log('📁 Looking for file: NIFTY_15m.csv');
  
  try {
    const candles = await provider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
    console.log('✅ Success! Loaded', candles.length, 'candles');
    
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
      console.log('❌ No candles loaded - this explains the "No historical data" error');
    }
    
  } catch (error) {
    console.error('❌ Error loading data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDataAccess();
