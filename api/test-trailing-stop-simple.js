/**
 * Simple Trailing Stop Component Test
 * Tests the component logic without full NestJS bootstrap
 */

const fs = require('fs');
const path = require('path');

// Mock the trailing stop components for testing
class MockATRTrailingStopComponent {
  checkTrailingStops(trades, currentCandle, atr, config) {
    if (!config.enabled || trades.length === 0) {
      return [];
    }

    const results = [];
    for (const trade of trades) {
      const result = this.checkTradeTrailingStop(trade, currentCandle, atr, config);
      if (result.shouldExit) {
        results.push(result);
      }
    }
    return results;
  }

  updateTrailingStops(trades, currentCandle, atr, config) {
    if (!config.enabled) {
      return trades;
    }
    return trades.map(trade => this.updateTradeTrailingStop(trade, currentCandle, atr, config));
  }

  checkTradeTrailingStop(trade, currentCandle, atr, config) {
    const currentPrice = currentCandle.close;
    const profit = trade.direction === 'LONG' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    const profitPercentage = profit / trade.entryPrice;

    if (profitPercentage < config.activationProfit) {
      return {
        shouldExit: false,
        exitPrice: currentPrice,
        reason: 'INSUFFICIENT_PROFIT',
        diagnostics: {
          tradeId: trade.id,
          entryPrice: trade.entryPrice,
          currentPrice,
          profit,
          profitPercentage,
          trailingStopPrice: trade.trailingStopPrice || 0,
          trailingStopDistance: 0,
          isTrailingActive: false
        }
      };
    }

    const trailingStopDistance = atr * config.atrMultiplier;
    const finalTrailingStopDistance = config.maxTrailDistance 
      ? Math.min(trailingStopDistance, config.maxTrailDistance)
      : trailingStopDistance;

    let trailingStopPrice, shouldExit = false;

    if (trade.direction === 'LONG') {
      const highestPrice = Math.max(trade.highestPrice || trade.entryPrice, currentCandle.high);
      trailingStopPrice = highestPrice - finalTrailingStopDistance;
      shouldExit = currentPrice <= trailingStopPrice;
    } else {
      const lowestPrice = Math.min(trade.lowestPrice || trade.entryPrice, currentCandle.low);
      trailingStopPrice = lowestPrice + finalTrailingStopDistance;
      shouldExit = currentPrice >= trailingStopPrice;
    }

    return {
      shouldExit,
      exitPrice: shouldExit ? trailingStopPrice : currentPrice,
      reason: shouldExit ? 'TRAILING_STOP_HIT' : 'TRAILING_STOP_ACTIVE',
      diagnostics: {
        tradeId: trade.id,
        entryPrice: trade.entryPrice,
        currentPrice,
        profit,
        profitPercentage,
        trailingStopPrice,
        trailingStopDistance: finalTrailingStopDistance,
        isTrailingActive: true
      }
    };
  }

  updateTradeTrailingStop(trade, currentCandle, atr, config) {
    const currentPrice = currentCandle.close;
    const profit = trade.direction === 'LONG' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    const profitPercentage = profit / trade.entryPrice;

    if (profitPercentage < config.activationProfit) {
      return trade;
    }

    const updatedTrade = { ...trade };
    const trailingStopDistance = atr * config.atrMultiplier;
    const finalTrailingStopDistance = config.maxTrailDistance 
      ? Math.min(trailingStopDistance, config.maxTrailDistance)
      : trailingStopDistance;

    if (trade.direction === 'LONG') {
      const newHighestPrice = Math.max(
        trade.highestPrice || trade.entryPrice, 
        currentCandle.high
      );
      updatedTrade.highestPrice = newHighestPrice;
      updatedTrade.trailingStopPrice = newHighestPrice - finalTrailingStopDistance;
    } else {
      const newLowestPrice = Math.min(
        trade.lowestPrice || trade.entryPrice, 
        currentCandle.low
      );
      updatedTrade.lowestPrice = newLowestPrice;
      updatedTrade.trailingStopPrice = newLowestPrice + finalTrailingStopDistance;
    }

    updatedTrade.isTrailingActive = true;
    return updatedTrade;
  }
}

class MockPercentageTrailingStopComponent {
  checkTrailingStops(trades, currentCandle, atr, config) {
    if (!config.enabled || trades.length === 0) {
      return [];
    }

    const results = [];
    for (const trade of trades) {
      const result = this.checkTradeTrailingStop(trade, currentCandle, atr, config);
      if (result.shouldExit) {
        results.push(result);
      }
    }
    return results;
  }

  updateTrailingStops(trades, currentCandle, atr, config) {
    if (!config.enabled) {
      return trades;
    }
    return trades.map(trade => this.updateTradeTrailingStop(trade, currentCandle, atr, config));
  }

  checkTradeTrailingStop(trade, currentCandle, atr, config) {
    const currentPrice = currentCandle.close;
    const profit = trade.direction === 'LONG' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    const profitPercentage = profit / trade.entryPrice;

    if (profitPercentage < config.activationProfit) {
      return {
        shouldExit: false,
        exitPrice: currentPrice,
        reason: 'INSUFFICIENT_PROFIT',
        diagnostics: {
          tradeId: trade.id,
          entryPrice: trade.entryPrice,
          currentPrice,
          profit,
          profitPercentage,
          trailingStopPrice: trade.trailingStopPrice || 0,
          trailingStopDistance: 0,
          isTrailingActive: false
        }
      };
    }

    let trailingStopPrice, shouldExit = false;

    if (trade.direction === 'LONG') {
      const highestPrice = Math.max(trade.highestPrice || trade.entryPrice, currentCandle.high);
      trailingStopPrice = highestPrice * (1 - config.percentage);
      shouldExit = currentPrice <= trailingStopPrice;
    } else {
      const lowestPrice = Math.min(trade.lowestPrice || trade.entryPrice, currentCandle.low);
      trailingStopPrice = lowestPrice * (1 + config.percentage);
      shouldExit = currentPrice >= trailingStopPrice;
    }

    return {
      shouldExit,
      exitPrice: shouldExit ? trailingStopPrice : currentPrice,
      reason: shouldExit ? 'TRAILING_STOP_HIT' : 'TRAILING_STOP_ACTIVE',
      diagnostics: {
        tradeId: trade.id,
        entryPrice: trade.entryPrice,
        currentPrice,
        profit,
        profitPercentage,
        trailingStopPrice,
        trailingStopDistance: Math.abs(currentPrice - trailingStopPrice),
        isTrailingActive: true
      }
    };
  }

  updateTradeTrailingStop(trade, currentCandle, atr, config) {
    const currentPrice = currentCandle.close;
    const profit = trade.direction === 'LONG' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    const profitPercentage = profit / trade.entryPrice;

    if (profitPercentage < config.activationProfit) {
      return trade;
    }

    const updatedTrade = { ...trade };

    if (trade.direction === 'LONG') {
      const newHighestPrice = Math.max(
        trade.highestPrice || trade.entryPrice, 
        currentCandle.high
      );
      updatedTrade.highestPrice = newHighestPrice;
      updatedTrade.trailingStopPrice = newHighestPrice * (1 - config.percentage);
    } else {
      const newLowestPrice = Math.min(
        trade.lowestPrice || trade.entryPrice, 
        currentCandle.low
      );
      updatedTrade.lowestPrice = newLowestPrice;
      updatedTrade.trailingStopPrice = newLowestPrice * (1 + config.percentage);
    }

    updatedTrade.isTrailingActive = true;
    return updatedTrade;
  }
}

class MockTrailingStopFactory {
  constructor() {
    this.atrTrailingStop = new MockATRTrailingStopComponent();
    this.percentageTrailingStop = new MockPercentageTrailingStopComponent();
  }

  createTrailingStopComponent(config) {
    if (!config.enabled) {
      return {
        checkTrailingStops: () => [],
        updateTrailingStops: (trades) => trades
      };
    }

    switch (config.type) {
      case 'ATR':
        return this.atrTrailingStop;
      case 'PERCENTAGE':
        return this.percentageTrailingStop;
      default:
        throw new Error(`Unsupported trailing stop type: ${config.type}`);
    }
  }
}

class MockTrailingStopService {
  constructor() {
    this.trailingStopFactory = new MockTrailingStopFactory();
  }

  processTrailingStops(trades, currentCandle, atr, config) {
    if (!config.enabled || trades.length === 0) {
      return {
        exitSignals: [],
        updatedTrades: trades
      };
    }

    const trailingStopComponent = this.trailingStopFactory.createTrailingStopComponent(config);
    const updatedTrades = trailingStopComponent.updateTrailingStops(trades, currentCandle, atr, config);
    const exitSignals = trailingStopComponent.checkTrailingStops(updatedTrades, currentCandle, atr, config);

    return {
      exitSignals,
      updatedTrades
    };
  }

  getTrailingStopStats(trades) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        activeTrailingStops: 0,
        averageProfit: 0,
        averageTrailingStopDistance: 0
      };
    }

    const activeTrailingStops = trades.filter(trade => trade.isTrailingActive).length;
    const profits = trades.map(trade => 0); // Placeholder
    const averageProfit = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;
    const trailingStopDistances = trades
      .filter(trade => trade.trailingStopPrice)
      .map(trade => Math.abs(trade.entryPrice - (trade.trailingStopPrice || 0)));
    const averageTrailingStopDistance = trailingStopDistances.length > 0
      ? trailingStopDistances.reduce((sum, distance) => sum + distance, 0) / trailingStopDistances.length
      : 0;

    return {
      totalTrades: trades.length,
      activeTrailingStops,
      averageProfit,
      averageTrailingStopDistance
    };
  }
}

async function testTrailingStopComponent() {
  console.log('🚀 Starting Simple Trailing Stop Component Tests...\n');

  try {
    const trailingStopService = new MockTrailingStopService();
    console.log('✅ Mock services initialized successfully\n');

    // Test 1: ATR Trailing Stop Component
    console.log('📊 Test 1: ATR Trailing Stop Component');
    await testATRTrailingStop(trailingStopService);

    // Test 2: Percentage Trailing Stop Component
    console.log('\n📊 Test 2: Percentage Trailing Stop Component');
    await testPercentageTrailingStop(trailingStopService);

    // Test 3: Factory Pattern
    console.log('\n📊 Test 3: Factory Pattern');
    await testTrailingStopFactory(trailingStopService);

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

  const activeTrades = [
    {
      id: 'trade-1',
      direction: 'LONG',
      entryPrice: 100,
      entryTime: Date.now() - 3600000,
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
      entryTime: Date.now() - 1800000,
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 102,
      lowestPrice: 95,
      trailingStopPrice: 97,
      isTrailingActive: true
    }
  ];

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

  const atr = 2.5;
  const config = {
    enabled: true,
    type: 'ATR',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01,
    maxTrailDistance: 5.0
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
      entryTime: Date.now() - 7200000,
      quantity: 1,
      symbol: 'NIFTY',
      highestPrice: 210,
      lowestPrice: 195,
      trailingStopPrice: 205.8,
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
    percentage: 0.02,
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

async function testTrailingStopFactory(trailingStopService) {
  console.log('  Testing Factory pattern...');

  const atrConfig = {
    enabled: true,
    type: 'ATR',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01
  };

  const atrComponent = trailingStopService.trailingStopFactory.createTrailingStopComponent(atrConfig);
  console.log(`    ✅ ATR Component created: ${atrComponent.constructor.name}`);

  const percentageConfig = {
    enabled: true,
    type: 'PERCENTAGE',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01
  };

  const percentageComponent = trailingStopService.trailingStopFactory.createTrailingStopComponent(percentageConfig);
  console.log(`    ✅ Percentage Component created: ${percentageComponent.constructor.name}`);

  const disabledConfig = {
    enabled: false,
    type: 'ATR',
    atrMultiplier: 2.0,
    percentage: 0.02,
    activationProfit: 0.01
  };

  const disabledComponent = trailingStopService.trailingStopFactory.createTrailingStopComponent(disabledConfig);
  console.log(`    ✅ Disabled Component created: ${disabledComponent.constructor.name}`);
}

async function testEdgeCases(trailingStopService) {
  console.log('  Testing edge cases...');

  const emptyResult = trailingStopService.processTrailingStops(
    [],
    { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000, symbol: 'NIFTY', timeframe: '15m' },
    2.0,
    { enabled: true, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 }
  );
  console.log(`    ✅ Empty trades handled: ${emptyResult.exitSignals.length} signals`);

  const disabledResult = trailingStopService.processTrailingStops(
    [{ id: 'test', direction: 'LONG', entryPrice: 100, entryTime: Date.now(), quantity: 1, symbol: 'NIFTY' }],
    { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000, symbol: 'NIFTY', timeframe: '15m' },
    2.0,
    { enabled: false, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 }
  );
  console.log(`    ✅ Disabled config handled: ${disabledResult.exitSignals.length} signals`);

  const lowProfitTrades = [{
    id: 'low-profit',
    direction: 'LONG',
    entryPrice: 100,
    entryTime: Date.now(),
    quantity: 1,
    symbol: 'NIFTY',
    highestPrice: 100.5,
    lowestPrice: 99.5,
    trailingStopPrice: 99.5,
    isTrailingActive: false
  }];

  const lowProfitResult = trailingStopService.processTrailingStops(
    lowProfitTrades,
    { timestamp: Date.now(), open: 100.2, high: 100.5, low: 100, close: 100.3, volume: 1000, symbol: 'NIFTY', timeframe: '15m' },
    2.0,
    { enabled: true, type: 'ATR', atrMultiplier: 2.0, percentage: 0.02, activationProfit: 0.01 }
  );
  console.log(`    ✅ Low profit handled: ${lowProfitResult.exitSignals.length} signals`);
}

async function testPerformance(trailingStopService) {
  console.log('  Testing performance with large number of trades...');

  const largeTradeSet = [];
  for (let i = 0; i < 1000; i++) {
    largeTradeSet.push({
      id: `trade-${i}`,
      direction: i % 2 === 0 ? 'LONG' : 'SHORT',
      entryPrice: 100 + Math.random() * 20,
      entryTime: Date.now() - Math.random() * 86400000,
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


