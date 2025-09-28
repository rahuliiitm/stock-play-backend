const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');

async function analyzeMissedTrades() {
  console.log('🔍 Analyzing missed trades and configuration issues...\n');
  
  const dataProvider = new CsvDataProvider();
  const advancedATRStrategy = new AdvancedATRStrategyService();
  
  const startDate = new Date('2024-01-01T00:00:00.000Z');
  const endDate = new Date('2024-06-30T23:59:59.000Z');
  const candles = await dataProvider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
  
  console.log(`📊 Loaded ${candles.length} candles for analysis\n`);
  
  const config = {
    id: 'detailed-analysis',
    name: 'Detailed Trade Analysis',
    symbol: 'NIFTY',
    timeframe: '15m',
    emaFastPeriod: 9,
    emaSlowPeriod: 21,
    atrPeriod: 14,
    atrDeclineThreshold: 0.1,
    atrExpansionThreshold: 0.02,
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
  };
  
  console.log('⚙️  Configuration Analysis:');
  console.log(`   📊 ATR Decline: ${config.atrDeclineThreshold * 100}%`);
  console.log(`   📊 ATR Expansion: ${config.atrExpansionThreshold * 100}%`);
  console.log(`   📊 RSI Entry Long: ${config.rsiEntryLong}`);
  console.log(`   📊 RSI Entry Short: ${config.rsiEntryShort}`);
  console.log(`   ⏰ MIS Exit Time: ${config.misExitTime}`);
  console.log(`   ⏰ CNC Exit Time: ${config.cncExitTime}\n`);
  
  let allSignals = [];
  let rsiBlocks = [];
  let timeExits = [];
  
  const testCandles = candles.slice(-200);
  console.log(`📊 Analyzing ${testCandles.length} candles\n`);
  
  for (let i = 0; i < testCandles.length; i++) {
    const candle = testCandles[i];
    const currentCandles = candles.slice(0, candles.indexOf(candle) + 1);
    
    if (currentCandles.length < 50) continue;
    
    const evaluation = advancedATRStrategy.evaluate(config, currentCandles);
    const diagnostics = evaluation.diagnostics;
    
    const candleTime = new Date(candle.timestamp);
    const isExitTime = candleTime.getHours() === 15 && candleTime.getMinutes() >= 15;
    
    if (diagnostics) {
      if (diagnostics.rsi !== undefined) {
        if (diagnostics.rsi < config.rsiEntryLong && diagnostics.isBullishTrend) {
          rsiBlocks.push({
            timestamp: candle.timestamp,
            rsi: diagnostics.rsi,
            reason: `RSI ${diagnostics.rsi.toFixed(2)} < ${config.rsiEntryLong}`,
            price: candle.close
          });
        }
        if (diagnostics.rsi > config.rsiEntryShort && diagnostics.isBearishTrend) {
          rsiBlocks.push({
            timestamp: candle.timestamp,
            rsi: diagnostics.rsi,
            reason: `RSI ${diagnostics.rsi.toFixed(2)} > ${config.rsiEntryShort}`,
            price: candle.close
          });
        }
      }
      
      if (isExitTime) {
        timeExits.push({
          timestamp: candle.timestamp,
          time: candleTime.toISOString(),
          price: candle.close
        });
      }
    }
    
    for (const signal of evaluation.signals) {
      allSignals.push({
        timestamp: signal.timestamp,
        type: signal.type,
        direction: signal.data.direction,
        price: signal.data.price,
        signalType: signal.data.diagnostics?.signalType || 'UNKNOWN'
      });
    }
  }
  
  console.log('='.repeat(80));
  console.log('📊 DETAILED TRADE ANALYSIS RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n📈 SIGNAL BREAKDOWN:');
  const signalTypes = {};
  allSignals.forEach(signal => {
    signalTypes[signal.type] = (signalTypes[signal.type] || 0) + 1;
  });
  
  Object.entries(signalTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  console.log('\n🚫 BLOCKED OPPORTUNITIES:');
  console.log(`   📊 RSI Blocks: ${rsiBlocks.length}`);
  console.log(`   ⏰ Time Exits: ${timeExits.length}`);
  
  if (rsiBlocks.length > 0) {
    console.log('\n📊 RSI BLOCKING ANALYSIS (first 10):');
    rsiBlocks.slice(0, 10).forEach((block, index) => {
      console.log(`   ${index + 1}. ${new Date(block.timestamp).toISOString()} - RSI: ${block.rsi.toFixed(2)} - ${block.reason} - Price: ${block.price}`);
    });
  }
  
  if (timeExits.length > 0) {
    console.log('\n⏰ TIME EXIT ANALYSIS (first 10):');
    timeExits.slice(0, 10).forEach((exit, index) => {
      console.log(`   ${index + 1}. ${exit.time} - Price: ${exit.price}`);
    });
  }
  
  console.log('\n🔧 CONFIGURATION ISSUES IDENTIFIED:');
  
  if (timeExits.length > 0) {
    console.log(`   ⚠️  TIME EXITS: ${timeExits.length} time-based exits detected`);
    console.log(`   💡 SOLUTION: Remove time exits for backtesting`);
  }
  
  if (rsiBlocks.length > 0) {
    console.log(`   ⚠️  RSI BLOCKS: ${rsiBlocks.length} opportunities blocked by RSI`);
    console.log(`   💡 SOLUTION: Lower RSI thresholds (try 30/70)`);
  }
  
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('   1. Remove time-based exits: misExitTime: null, cncExitTime: null');
  console.log('   2. Lower RSI thresholds: rsiEntryLong: 30, rsiEntryShort: 70');
  console.log('   3. Adjust ATR thresholds: atrExpansionThreshold: 0.01 (1%)');
  console.log('   4. Increase max lots: maxLots: 10');
  
  console.log('\n🎉 Analysis completed!\n');
}

analyzeMissedTrades().catch(error => {
  console.error('❌ Analysis failed:', error);
});
