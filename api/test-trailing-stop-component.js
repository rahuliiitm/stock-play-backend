const { AppModule } = require('./dist/src/app.module');
const { NestFactory } = require('@nestjs/core');

/**
 * Comprehensive Test Script for Trailing Stop Component
 * Tests ATR and Percentage trailing stops with different configurations
 */

async function testTrailingStopComponent() {
  console.log('🚀 Starting Trailing Stop Component Tests...\n');

  try {
    // Bootstrap the application
    const app = await NestFactory.createApplicationContext(AppModule);
    const trailingStopService = app.get('TrailingStopService');
    const trailingStopFactory = app.get('TrailingStopFactory');

    console.log('✅ Application bootstrapped successfully\n');

    // Test 1: ATR Trailing Stop Component
    console.log('📊 Test 1: ATR Trailing Stop Component');
    await testATRTrailingStop(trailingStopService);

    // Test 2: Percentage Trailing Stop Component
    console.log('\n📊 Test 2: Percentage Trailing Stop Component');
    await testPercentageTrailingStop(trailingStopService);

    // Test 3: Factory Pattern
    console.log('\n📊 Test 3: Factory Pattern');
    await testTrailingStopFactory(trailingStopFactory);

    // Test 4: Edge Cases
    console.log('\n📊 Test 4: Edge Cases');
    await testEdgeCases(trailingStopService);

    // Test 5: Performance Test
    console.log('\n📊 Test 5: Performance Test');
    await testPerformance(trailingStopService);

    console.log('\n🎉 All Trailing Stop Component Tests Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function testATRTrailingStop(trailingStopService) {
  console.log('  Testing ATR-based trailing stop...');

  // Create mock active trades
  const activeTrades = [
    {
      id: 'trade-1',
      direction: 'LONG',
      entryPrice: 100,
      entryTime: Date.now() - 3600000, // 1 hour ago
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 105,
      lowestPrice: 98,
      trailingStopPrice: 103,
      isTrailingActive: true
    },
    {
      id: 'trade-2',
      direction: 'SHORT',
      entryPrice: 100,
      entryTime: Date.now() - 1800000, // 30 minutes ago
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 102,
      lowestPrice: 95,
      trailingStopPrice: 97,
      isTrailingActive: true
    }
  ];

  // Create mock candle
  const currentCandle = {
    timestamp: Date.now(),
    open: 102,
    high: 106,
    low: 101,
    close: 104,
    volume: 1000,
    symbol: 'NIFTY',
    timeframe: '15m'
  };

  // ATR configuration
  const atr = 2.5;
  const config = {
    enabled: true,
    type: 'ATR',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01,
    maxTrailDistance: 5.0
  };

  // Test trailing stop processing
  const result = trailingStopService.processTrailingStops(
    activeTrades,
    currentCandle,
    atr,
    config
  );

  console.log(`    ✅ Processed ${result.updatedTrades.length} trades`);
  console.log(`    ✅ Generated ${result.exitSignals.length} exit signals`);
  
  if (result.exitSignals.length > 0) {
    result.exitSignals.forEach(signal => {
      console.log(`    📈 Exit Signal: ${signal.diagnostics.tradeId} - ${signal.reason}`);
    });
  }

  // Test statistics
  const stats = trailingStopService.getTrailingStopStats(result.updatedTrades);
  console.log(`    📊 Stats: ${stats.activeTrailingStops}/${stats.totalTrades} active trailing stops`);
}

async function testPercentageTrailingStop(trailingStopService) {
  console.log('  Testing Percentage-based trailing stop...');

  const activeTrades = [
    {
      id: 'trade-3',
      direction: 'LONG',
      entryPrice: 200,
      entryTime: Date.now() - 7200000, // 2 hours ago
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 210,
      lowestPrice: 195,
      trailingStopPrice: 205.8, // 2% below highest
      isTrailingActive: true
    }
  ];

  const currentCandle = {
    timestamp: Date.now(),
    open: 208,
    high: 212,
    low: 207,
    close: 209,
    volume: 1500,
    symbol: 'NIFTY',
    timeframe: '15m'
  };

  const atr = 3.0;
  const config = {
    enabled: true,
    type: 'PERCENTAGE',
    atrMultiplier: 2.0,
    percentage: 0.02, // 2%
    activationProfit: 0.01,
    maxTrailDistance: 10.0
  };

  const result = trailingStopService.processTrailingStops(
    activeTrades,
    currentCandle,
    atr,
    config
  );

  console.log(`    ✅ Processed ${result.updatedTrades.length} trades`);
  console.log(`    ✅ Generated ${result.exitSignals.length} exit signals`);

  if (result.exitSignals.length > 0) {
    result.exitSignals.forEach(signal => {
      console.log(`    📈 Exit Signal: ${signal.diagnostics.tradeId} - ${signal.reason}`);
    });
  }
}

async function testTrailingStopFactory(trailingStopFactory) {
  console.log('  Testing Factory pattern...');

  // Test ATR component creation
  const atrConfig = {
    enabled: true,
    type: 'ATR',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01
  };

  const atrComponent = trailingStopFactory.createTrailingStopComponent(atrConfig);
  console.log(`    ✅ ATR Component created: ${atrComponent.constructor.name}`);

  // Test Percentage component creation
  const percentageConfig = {
    enabled: true,
    type: 'PERCENTAGE',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01
  };

  const percentageComponent = trailingStopFactory.createTrailingStopComponent(percentageConfig);
  console.log(`    ✅ Percentage Component created: ${percentageComponent.constructor.name}`);

  // Test disabled component
  const disabledConfig = {
    enabled: false,
    type: 'ATR',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01
  };

  const disabledComponent = trailingStopFactory.createTrailingStopComponent(disabledConfig);
  console.log(`    ✅ Disabled Component created: ${disabledComponent.constructor.name}`);
}

async function testEdgeCases(trailingStopService) {
  console.log('  Testing edge cases...');

  // Test with no active trades
  const emptyResult = trailingStopService.processTrailingStops(
    [],
    { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000, symbol: 'NIFTY', timeframe: '15m' },
    2.0,
    { enabled: true, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 }
  );
  console.log(`    ✅ Empty trades handled: ${emptyResult.exitSignals.length} signals`);

  // Test with disabled trailing stop
  const disabledResult = trailingStopService.processTrailingStops(
    [{ id: 'test', direction: 'LONG', entryPrice: 100, entryTime: Date.now(), quantity: 1, symbol: 'NIFTY' }],
    { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000, symbol: 'NIFTY', timeframe: '15m' },
    2.0,
    { enabled: false, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 }
  );
  console.log(`    ✅ Disabled config handled: ${disabledResult.exitSignals.length} signals`);

  // Test with insufficient profit
  const lowProfitTrades = [{
    id: 'low-profit',
    direction: 'LONG',
    entryPrice: 100,
    entryTime: Date.now(),
    quantity: 1,
    symbol: 'NIFTY',
    highestPrice: 100.5, // Only 0.5% profit
    lowestPrice: 99.5,
    trailingStopPrice: 99.5,
    isTrailingActive: false
  }];

  const lowProfitResult = trailingStopService.processTrailingStops(
    lowProfitTrades,
    { timestamp: Date.now(), open: 100.2, high: 100.5, low: 100, close: 100.3, volume: 1000, symbol: 'NIFTY', timeframe: '15m' },
    2.0,
    { enabled: true, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 } // 1% activation
  );
  console.log(`    ✅ Low profit handled: ${lowProfitResult.exitSignals.length} signals`);
}

async function testPerformance(trailingStopService) {
  console.log('  Testing performance with large number of trades...');

  // Create 1000 mock trades
  const largeTradeSet = [];
  for (let i = 0; i < 1000; i++) {
    largeTradeSet.push({
      id: `trade-${i}`,
      direction: i % 2 === 0 ? 'LONG' : 'SHORT',
      entryPrice: 100 + Math.random() * 20,
      entryTime: Date.now() - Math.random() * 86400000, // Random time in last 24 hours
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 100 + Math.random() * 30,
      lowestPrice: 90 + Math.random() * 20,
      trailingStopPrice: 95 + Math.random() * 30,
      isTrailingActive: Math.random() > 0.5
    });
  }

  const startTime = Date.now();
  
  const result = trailingStopService.processTrailingStops(
    largeTradeSet,
    { timestamp: Date.now(), open: 110, high: 115, low: 105, close: 112, volume: 5000, symbol: 'NIFTY', timeframe: '15m' },
    2.5,
    { enabled: true, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 }
  );

  const endTime = Date.now();
  const processingTime = endTime - startTime;

  console.log(`    ✅ Processed ${largeTradeSet.length} trades in ${processingTime}ms`);
  console.log(`    ✅ Generated ${result.exitSignals.length} exit signals`);
  console.log(`    ✅ Performance: ${(largeTradeSet.length / processingTime * 1000).toFixed(0)} trades/second`);
}

// Run the tests
testTrailingStopComponent().catch(console.error);


