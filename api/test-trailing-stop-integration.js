const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');

async function testTrailingStopIntegration() {
  console.log('🚀 Testing Trailing Stop Integration...');
  
  try {
    // Bootstrap the application
    const app = await NestFactory.create(AppModule);
    
    // Get the TrailingStopService
    const trailingStopService = app.get('TrailingStopService');
    console.log('✅ TrailingStopService found:', typeof trailingStopService);
    
    // Check if processTrailingStops method exists
    if (typeof trailingStopService.processTrailingStops === 'function') {
      console.log('✅ processTrailingStops method exists');
    } else {
      console.log('❌ processTrailingStops method does not exist');
      console.log('Available methods:', Object.getOwnPropertyNames(trailingStopService));
    }
    
    // Test with mock data
    const mockTrades = [{
      id: 'test-1',
      direction: 'LONG',
      entryPrice: 100,
      entryTime: Date.now(),
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 100,
      lowestPrice: 100,
      trailingStopPrice: 0,
      isTrailingActive: false
    }];
    
    const mockCandle = {
      open: 100,
      high: 105,
      low: 98,
      close: 103,
      volume: 1000,
      timestamp: Date.now()
    };
    
    const mockConfig = {
      enabled: true,
      type: 'ATR',
      atrMultiplier: 2.0,
      percentage: 0.02,
      activationProfit: 0.01,
      maxTrailDistance: 0.05
    };
    
    console.log('🧪 Testing processTrailingStops with mock data...');
    const result = trailingStopService.processTrailingStops(
      mockTrades,
      mockCandle,
      2.0, // ATR
      mockConfig
    );
    
    console.log('✅ Trailing stop result:', result);
    console.log('🎉 Trailing Stop Integration Test PASSED!');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Trailing Stop Integration Test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testTrailingStopIntegration();


