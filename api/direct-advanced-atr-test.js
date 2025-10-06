const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');
const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');

/**
 * Direct test of advanced ATR strategy without API
 */
async function testAdvancedATRDirectly() {
  console.log('🧪 Testing Advanced ATR Strategy directly...');
  
  try {
    // Create instances
    const dataProvider = new CsvDataProvider();
    const orderExecution = new MockOrderExecutionProvider();
    const advancedATRStrategy = new AdvancedATRStrategyService();
    
    // Test configuration
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-06-30T23:59:59.000Z'),
      initialBalance: 100000,
      strategyConfig: {
        id: 'advanced-atr-direct-test',
        name: 'Advanced ATR Direct Test',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        
        // Advanced ATR parameters
        atrDeclineThreshold: 0.1,        // 10% ATR decline triggers FIFO exit
        atrExpansionThreshold: 0.1,       // 10% ATR expansion triggers pyramiding
        
        strongCandleThreshold: 0.01,
        gapUpDownThreshold: 0.01,
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 45,
        rsiExitShort: 55,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    };
    
    console.log('📤 Running direct advanced ATR test...');
    console.log('⚙️  Configuration:');
    console.log(`   📊 ATR Decline Threshold: ${config.strategyConfig.atrDeclineThreshold * 100}%`);
    console.log(`   📊 ATR Expansion Threshold: ${config.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   🔄 Pyramiding Enabled: ${config.strategyConfig.pyramidingEnabled}`);
    console.log(`   🚪 Exit Mode: ${config.strategyConfig.exitMode}`);
    
    // Test data loading first
    console.log('\n📊 Testing data loading...');
    const candles = await dataProvider.getHistoricalCandles(
      config.symbol,
      config.timeframe,
      config.startDate,
      config.endDate
    );
    
    console.log(`✅ Loaded ${candles.length} candles`);
    
    if (candles.length === 0) {
      console.log('❌ No candles loaded - cannot proceed with test');
      return;
    }
    
    console.log('📊 First candle:', {
      timestamp: new Date(candles[0].timestamp).toISOString(),
      open: candles[0].open,
      close: candles[0].close
    });
    
    console.log('📊 Last candle:', {
      timestamp: new Date(candles[candles.length - 1].timestamp).toISOString(),
      open: candles[candles.length - 1].open,
      close: candles[candles.length - 1].close
    });
    
    // Test strategy evaluation
    console.log('\n🧮 Testing strategy evaluation...');
    const evaluation = advancedATRStrategy.evaluate(config.strategyConfig, candles);
    
    console.log(`✅ Strategy evaluation completed`);
    console.log(`📊 Signals generated: ${evaluation.signals.length}`);
    
    if (evaluation.signals.length > 0) {
      console.log('\n📈 Sample signals:');
      evaluation.signals.slice(0, 3).forEach((signal, index) => {
        console.log(`   ${index + 1}. ${signal.type} ${signal.data.direction} at ${signal.data.price} (${new Date(signal.timestamp).toISOString()})`);
      });
    }
    
    // Test diagnostics
    console.log('\n🔍 Strategy diagnostics:');
    console.log(`   📊 Fast EMA: ${evaluation.diagnostics.fast}`);
    console.log(`   📊 Slow EMA: ${evaluation.diagnostics.slow}`);
    console.log(`   📊 ATR: ${evaluation.diagnostics.atr}`);
    console.log(`   📊 RSI: ${evaluation.diagnostics.rsi}`);
    console.log(`   📊 ATR Expanding: ${evaluation.diagnostics.atrExpanding}`);
    console.log(`   📊 ATR Declining: ${evaluation.diagnostics.atrDeclining}`);
    console.log(`   📊 Tracked ATR: ${evaluation.diagnostics.trackedATR}`);
    
    // Simulate a simple backtest
    console.log('\n🎯 Simulating backtest...');
    let balance = config.initialBalance;
    let positions = [];
    let trades = [];
    
    // Process a subset of candles for testing
    const testCandles = candles.slice(-100); // Last 100 candles
    console.log(`📊 Processing ${testCandles.length} candles for simulation`);
    
    for (let i = 0; i < testCandles.length; i++) {
      const candle = testCandles[i];
      const currentCandles = candles.slice(0, candles.indexOf(candle) + 1);
      
      if (currentCandles.length < 50) continue; // Need enough data for indicators
      
      const eval = advancedATRStrategy.evaluate(config.strategyConfig, currentCandles);
      
      for (const signal of eval.signals) {
        if (signal.type === 'ENTRY') {
          const trade = {
            id: `trade_${trades.length + 1}`,
            direction: signal.data.direction,
            entryPrice: signal.data.price,
            entryTime: signal.timestamp,
            quantity: config.strategyConfig.positionSize,
            signalType: signal.data.diagnostics?.signalType || 'ENTRY'
          };
          
          positions.push(trade);
          trades.push(trade);
          
          console.log(`📈 ${signal.data.direction} entry at ${signal.data.price} (${signal.data.diagnostics?.signalType || 'ENTRY'})`);
        }
        
        if (signal.type === 'EXIT' && positions.length > 0) {
          const position = positions.shift(); // FIFO
          const pnl = signal.data.direction === 'LONG' 
            ? (signal.data.price - position.entryPrice) * position.quantity
            : (position.entryPrice - signal.data.price) * position.quantity;
          
          balance += pnl;
          
          console.log(`📉 ${signal.data.direction} exit at ${signal.data.price} (${signal.data.diagnostics?.signalType || 'EXIT'}) - P&L: ${pnl.toFixed(2)}`);
        }
      }
    }
    
    // Calculate final results
    const totalReturn = ((balance - config.initialBalance) / config.initialBalance) * 100;
    const winningTrades = trades.filter(t => t.exitPrice && t.exitPrice > t.entryPrice).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ADVANCED ATR STRATEGY TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n💰 PERFORMANCE METRICS:`);
    console.log(`   📈 Total Trades: ${trades.length}`);
    console.log(`   💵 Total Return: ${totalReturn.toFixed(2)}%`);
    console.log(`   💰 Final Balance: ₹${balance.toLocaleString()}`);
    console.log(`   🎯 Win Rate: ${winRate.toFixed(2)}%`);
    console.log(`   📊 Open Positions: ${positions.length}`);
    
    console.log(`\n🔄 ATR LOGIC ANALYSIS:`);
    console.log(`   📊 ATR Decline Threshold: ${config.strategyConfig.atrDeclineThreshold * 100}%`);
    console.log(`   📊 ATR Expansion Threshold: ${config.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   🔄 Pyramiding: ${config.strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   🚪 Exit Mode: ${config.strategyConfig.exitMode}`);
    
    console.log('\n🎉 Advanced ATR strategy test completed successfully!');
    
    return {
      totalTrades: trades.length,
      totalReturn: totalReturn,
      finalBalance: balance,
      winRate: winRate,
      openPositions: positions.length
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
testAdvancedATRDirectly().catch(error => {
  console.error('❌ Advanced ATR test failed:', error);
});

