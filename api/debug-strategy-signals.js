// Ensure Web Crypto API exists (required by @nestjs/schedule on Node.js < 20)
const nodeCrypto = require('crypto');
if (typeof globalThis.crypto === 'undefined') {
  if (nodeCrypto.webcrypto) {
    globalThis.crypto = nodeCrypto.webcrypto;
  } else {
    globalThis.crypto = nodeCrypto;
  }
}

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const { StrategyIndicatorsService } = require('./dist/src/modules/strategy/indicators/strategy-indicators.service');
const { IndicatorProviderRegistryService } = require('./dist/src/modules/indicators/indicator-provider-registry.service');

async function debugStrategySignals() {
  console.log('🔍 Debugging Strategy Signal Generation...');
  
  try {
    // Create minimal app context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'debug'],
    });
    
    // Get services
    const priceActionStrategy = app.get(PriceActionStrategyService);
    const indicatorsService = app.get(StrategyIndicatorsService);
    
    console.log('✅ Services initialized');
    
    // Create test candles (simple data)
    const testCandles = [
      {
        symbol: 'NIFTY',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
        open: 22000,
        high: 22100,
        low: 21900,
        close: 22050,
        volume: 1000,
        timeframe: '1d'
      },
      {
        symbol: 'NIFTY',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 29,
        open: 22050,
        high: 22150,
        low: 22000,
        close: 22100,
        volume: 1000,
        timeframe: '1d'
      },
      {
        symbol: 'NIFTY',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 28,
        open: 22100,
        high: 22200,
        low: 22050,
        close: 22150,
        volume: 1000,
        timeframe: '1d'
      },
      {
        symbol: 'NIFTY',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 27,
        open: 22150,
        high: 22250,
        low: 22100,
        close: 22200,
        volume: 1000,
        timeframe: '1d'
      },
      {
        symbol: 'NIFTY',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 26,
        open: 22200,
        high: 22300,
        low: 22150,
        close: 22250,
        volume: 1000,
        timeframe: '1d'
      }
    ];
    
    console.log(`📊 Testing with ${testCandles.length} candles`);
    
    // Test configuration
    const config = {
      supertrendPeriod: 10,
      supertrendMultiplier: 2,
      atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9
    };
    
    // Test without context (no position)
    console.log('\n🧪 Test 1: No position context');
    const evaluation1 = await priceActionStrategy.evaluate(config, testCandles, {});
    console.log(`   Signals generated: ${evaluation1.signals.length}`);
    if (evaluation1.signals.length > 0) {
      evaluation1.signals.forEach((signal, i) => {
        console.log(`   Signal ${i + 1}: ${signal.type} ${signal.data.direction} @ ₹${signal.data.price}`);
      });
    }
    
    // Test with context (no active trades)
    console.log('\n🧪 Test 2: Empty position context');
    const context2 = {
      activeTrades: [],
      currentBalance: 100000,
      currentLots: 0
    };
    const evaluation2 = await priceActionStrategy.evaluate(config, testCandles, context2);
    console.log(`   Signals generated: ${evaluation2.signals.length}`);
    if (evaluation2.signals.length > 0) {
      evaluation2.signals.forEach((signal, i) => {
        console.log(`   Signal ${i + 1}: ${signal.type} ${signal.data.direction} @ ₹${signal.data.price}`);
      });
    }
    
    // Test with context (active trade)
    console.log('\n🧪 Test 3: With active trade context');
    const context3 = {
      activeTrades: [{
        id: 'test-trade-1',
        symbol: 'NIFTY',
        direction: 'LONG',
        entryPrice: 22000,
        quantity: 1,
        entryTime: new Date(),
        metadata: {
          entrySupertrend: 21900
        }
      }],
      currentBalance: 100000,
      currentLots: 1
    };
    const evaluation3 = await priceActionStrategy.evaluate(config, testCandles, context3);
    console.log(`   Signals generated: ${evaluation3.signals.length}`);
    if (evaluation3.signals.length > 0) {
      evaluation3.signals.forEach((signal, i) => {
        console.log(`   Signal ${i + 1}: ${signal.type} ${signal.data.direction} @ ₹${signal.data.price}`);
      });
    }
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

debugStrategySignals().catch(console.error);
