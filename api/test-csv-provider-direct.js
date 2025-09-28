const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');

async function testCsvProvider() {
  console.log('🧪 Testing CsvDataProvider directly...');
  
  const provider = new CsvDataProvider();
  
  const startDate = new Date('2024-09-27T00:00:00.000Z');
  const endDate = new Date('2024-09-29T23:59:59.000Z');
  
  console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
  
  try {
    const candles = await provider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
    console.log('✅ Success! Loaded', candles.length, 'candles');
    
    if (candles.length > 0) {
      console.log('📊 First candle:', {
        timestamp: candles[0].timestamp,
        date: new Date(candles[0].timestamp).toISOString(),
        open: candles[0].open,
        close: candles[0].close
      });
      console.log('📊 Last candle:', {
        timestamp: candles[candles.length - 1].timestamp,
        date: new Date(candles[candles.length - 1].timestamp).toISOString(),
        open: candles[candles.length - 1].open,
        close: candles[candles.length - 1].close
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCsvProvider();
