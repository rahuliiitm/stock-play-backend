const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');

async function debugDailyData() {
  console.log('🔍 Debugging daily data loading...');
  
  try {
    const dataProvider = new CsvDataProvider();
    
    console.log('📊 Testing data loading for 2023...');
    const candles = await dataProvider.getHistoricalCandles(
      'NIFTY',
      '1d',
      new Date('2023-01-01T09:15:00Z'),
      new Date('2023-12-31T15:30:00Z')
    );
    
    console.log(`📈 Loaded ${candles.length} candles for 2023`);
    
    if (candles.length > 0) {
      console.log('📅 First candle:', candles[0]);
      console.log('📅 Last candle:', candles[candles.length - 1]);
    }
    
    // Test with a smaller date range
    console.log('\n📊 Testing with smaller date range (Jan 2023)...');
    const janCandles = await dataProvider.getHistoricalCandles(
      'NIFTY',
      '1d',
      new Date('2023-01-01T09:15:00Z'),
      new Date('2023-01-31T15:30:00Z')
    );
    
    console.log(`📈 Loaded ${janCandles.length} candles for January 2023`);
    
    if (janCandles.length > 0) {
      console.log('📅 First candle:', janCandles[0]);
      console.log('📅 Last candle:', janCandles[janCandles.length - 1]);
    }
    
  } catch (error) {
    console.error('❌ Error debugging daily data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugDailyData();


