const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');

async function testSimpleBacktest() {
  console.log('🔧 Testing Simple Backtest with Warm-up Period');
  console.log('='.repeat(60));

  try {
    const strategy = new PriceActionStrategyService();

    // Test configuration
    const config = {
      id: 'price-action-test',
      name: 'Price Action Strategy',
      symbol: 'NIFTY',
      timeframe: '1w',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
        atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    };

    console.log('\n📊 Strategy Configuration:');
    console.log(`   Name: ${config.name}`);
    console.log(`   Symbol: ${config.symbol}`);
    console.log(`   Timeframe: ${config.timeframe}`);
    console.log(`   Supertrend: ${config.supertrendPeriod} (${config.supertrendMultiplier}x)`);
    console.log(`   ATR: ${config.atrPeriod}`);
    console.log(`   MACD: ${config.macdFast}/${config.macdSlow}/${config.macdSignal}`);

    // Test warm-up period calculation
    console.log('\n🔧 Testing Warm-up Period Calculation:');
    const warmupPeriod = strategy.getWarmupPeriod(config);
    console.log(`   Warm-up Period: ${warmupPeriod} candles`);

    // Test with mock data
    console.log('\n📈 Testing Strategy Evaluation:');
    
    // Generate mock weekly candles
    const mockCandles = [];
    let price = 10000;
    const startDate = new Date('2020-01-01');
    
    for (let i = 0; i < 200; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * 7)); // Weekly
      
      const open = price;
      const high = price + Math.random() * 200;
      const low = price - Math.random() * 200;
      const close = price + (Math.random() - 0.5) * 300;
      
      mockCandles.push({
        symbol: 'NIFTY',
        timestamp: date.getTime(),
        open: open,
        high: high,
        low: low,
        close: close,
        volume: 1000000,
        timeframe: '1w'
      });
      
      price = close + (Math.random() - 0.5) * 100;
    }

    console.log(`   Generated ${mockCandles.length} mock candles`);
    console.log(`   Date range: ${new Date(mockCandles[0].timestamp).toISOString().split('T')[0]} to ${new Date(mockCandles[mockCandles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Test strategy evaluation with warm-up period
    console.log('\n🎯 Testing Strategy Evaluation with Warm-up:');
    
    let signals = [];
    let inPosition = false;
    let positionDirection = null;
    let entrySupertrend = null;
    
    for (let i = 0; i < mockCandles.length; i++) {
      const currentCandles = mockCandles.slice(0, i + 1);
      
      // Skip warm-up period
      if (i < warmupPeriod - 1) {
        if (i % 20 === 0) {
          console.log(`   ⏳ Skipping candle ${i + 1} (warm-up period: ${warmupPeriod})`);
        }
        continue;
      }
      
      try {
        const evaluation = await strategy.evaluate(config, currentCandles);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          for (const signal of evaluation.signals) {
            if (signal.type === 'ENTRY' && !inPosition) {
              inPosition = true;
              positionDirection = signal.direction;
              entrySupertrend = signal.metadata?.entrySupertrend;
              signals.push({
                candle: i + 1,
                date: new Date(currentCandles[i].timestamp).toISOString().split('T')[0],
                type: 'ENTRY',
                direction: signal.direction,
                price: currentCandles[i].close,
                supertrend: signal.metadata?.entrySupertrend
              });
              console.log(`   📈 ENTRY ${signal.direction} @ ₹${currentCandles[i].close} (Candle ${i + 1})`);
            } else if (signal.type === 'EXIT' && inPosition) {
              inPosition = false;
              positionDirection = null;
              entrySupertrend = null;
              signals.push({
                candle: i + 1,
                date: new Date(currentCandles[i].timestamp).toISOString().split('T')[0],
                type: 'EXIT',
                direction: signal.direction,
                price: currentCandles[i].close
              });
              console.log(`   📉 EXIT ${signal.direction} @ ₹${currentCandles[i].close} (Candle ${i + 1})`);
            }
          }
        }
      } catch (error) {
        if (i % 20 === 0) {
          console.log(`   ⚠️  Error at candle ${i + 1}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Results Summary:');
    console.log(`   Total Signals: ${signals.length}`);
    console.log(`   Warm-up Period: ${warmupPeriod} candles`);
    console.log(`   Processed Candles: ${mockCandles.length - warmupPeriod + 1}`);
    
    if (signals.length > 0) {
      console.log('\n📈 Signal Details:');
      signals.forEach((signal, i) => {
        console.log(`   ${i + 1}. ${signal.type} ${signal.direction} @ ₹${signal.price} (${signal.date})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing simple backtest:', error);
    console.error('Stack trace:', error.stack);
  }
}

testSimpleBacktest().catch(console.error);