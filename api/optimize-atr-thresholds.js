const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');

/**
 * Optimize ATR thresholds for maximum performance
 */
async function optimizeATRThresholds() {
  console.log('🔧 Optimizing ATR thresholds for maximum performance...\n');
  
  const dataProvider = new CsvDataProvider();
  const advancedATRStrategy = new AdvancedATRStrategyService();
  
  // Load data
  const startDate = new Date('2024-01-01T00:00:00.000Z');
  const endDate = new Date('2024-06-30T23:59:59.000Z');
  const candles = await dataProvider.getHistoricalCandles('NIFTY', '15m', startDate, endDate);
  
  console.log(`📊 Loaded ${candles.length} candles for optimization\n`);
  
  // Test different threshold combinations
  const thresholdCombinations = [
    { decline: 0.05, expansion: 0.05, name: 'Very Permissive (5%)' },
    { decline: 0.1, expansion: 0.1, name: 'Standard (10%)' },
    { decline: 0.15, expansion: 0.15, name: 'Conservative (15%)' },
    { decline: 0.2, expansion: 0.2, name: 'Very Conservative (20%)' },
    { decline: 0.05, expansion: 0.1, name: 'Quick Exit, Slow Entry (5%/10%)' },
    { decline: 0.1, expansion: 0.05, name: 'Slow Exit, Quick Entry (10%/5%)' },
    { decline: 0.02, expansion: 0.1, name: 'Very Quick Exit (2%/10%)' },
    { decline: 0.1, expansion: 0.02, name: 'Very Quick Entry (10%/2%)' },
  ];
  
  const results = [];
  
  for (const { decline, expansion, name } of thresholdCombinations) {
    console.log(`🧪 Testing: ${name}`);
    console.log(`   📊 ATR Decline: ${decline * 100}%`);
    console.log(`   📊 ATR Expansion: ${expansion * 100}%`);
    
    const config = {
      id: `optimization-${name.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: `ATR Optimization - ${name}`,
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: decline,
      atrExpansionThreshold: expansion,
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
    
    try {
      // Simulate backtest
      let balance = 100000;
      let positions = [];
      let trades = [];
      
      // Process last 200 candles for optimization
      const testCandles = candles.slice(-200);
      
      for (let i = 0; i < testCandles.length; i++) {
        const candle = testCandles[i];
        const currentCandles = candles.slice(0, candles.indexOf(candle) + 1);
        
        if (currentCandles.length < 50) continue;
        
        const evaluation = advancedATRStrategy.evaluate(config, currentCandles);
        
        for (const signal of evaluation.signals) {
          if (signal.type === 'ENTRY') {
            const trade = {
              id: `trade_${trades.length + 1}`,
              direction: signal.data.direction,
              entryPrice: signal.data.price,
              entryTime: signal.timestamp,
              quantity: config.positionSize,
              signalType: signal.data.diagnostics?.signalType || 'ENTRY'
            };
            
            positions.push(trade);
            trades.push(trade);
          }
          
          if (signal.type === 'EXIT' && positions.length > 0) {
            const position = positions.shift(); // FIFO
            const pnl = signal.data.direction === 'LONG' 
              ? (signal.data.price - position.entryPrice) * position.quantity
              : (position.entryPrice - signal.data.price) * position.quantity;
            
            balance += pnl;
          }
        }
      }
      
      const totalReturn = ((balance - 100000) / 100000) * 100;
      const winningTrades = trades.filter(t => t.exitPrice && t.exitPrice > t.entryPrice).length;
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
      
      console.log(`   ✅ Results: ${trades.length} trades, ${totalReturn.toFixed(2)}% return, ${winRate.toFixed(1)}% win rate\n`);
      
      results.push({
        name,
        decline: decline * 100,
        expansion: expansion * 100,
        trades: trades.length,
        return: totalReturn,
        winRate: winRate,
        finalBalance: balance,
        openPositions: positions.length
      });
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      results.push({
        name,
        decline: decline * 100,
        expansion: expansion * 100,
        trades: 'Error',
        return: 'Error',
        winRate: 'Error',
        finalBalance: 'Error',
        openPositions: 'Error'
      });
    }
  }
  
  // Display results
  console.log('='.repeat(100));
  console.log('📊 ATR THRESHOLD OPTIMIZATION RESULTS');
  console.log('='.repeat(100));
  
  console.log('\n📈 RESULTS SUMMARY:');
  console.log('Configuration'.padEnd(30) + 'Trades'.padEnd(8) + 'Return'.padEnd(10) + 'Win Rate'.padEnd(10) + 'Balance');
  console.log('-'.repeat(100));
  
  results.forEach(r => {
    const trades = typeof r.trades === 'number' ? r.trades.toString() : r.trades;
    const returnVal = typeof r.return === 'number' ? `${r.return.toFixed(2)}%` : r.return;
    const winRate = typeof r.winRate === 'number' ? `${r.winRate.toFixed(1)}%` : r.winRate;
    const balance = typeof r.finalBalance === 'number' ? `₹${r.finalBalance.toLocaleString()}` : r.finalBalance;
    
    console.log(
      r.name.padEnd(30) + 
      trades.padEnd(8) + 
      returnVal.padEnd(10) + 
      winRate.padEnd(10) + 
      balance
    );
  });
  
  // Find best configurations
  const validResults = results.filter(r => typeof r.return === 'number');
  
  if (validResults.length > 0) {
    const bestReturn = Math.max(...validResults.map(r => r.return));
    const bestWinRate = Math.max(...validResults.map(r => r.winRate));
    const mostTrades = Math.max(...validResults.map(r => r.trades));
    
    console.log('\n🏆 BEST CONFIGURATIONS:');
    console.log(`   📊 Best Return: ${validResults.find(r => r.return === bestReturn)?.name} (${bestReturn.toFixed(2)}%)`);
    console.log(`   🎯 Best Win Rate: ${validResults.find(r => r.winRate === bestWinRate)?.name} (${bestWinRate.toFixed(2)}%)`);
    console.log(`   📈 Most Trades: ${validResults.find(r => r.trades === mostTrades)?.name} (${mostTrades} trades)`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (bestReturn > 0 && bestWinRate > 0) {
      console.log('   ✅ Promising configurations found!');
      console.log('   🔧 Consider fine-tuning around the best performing thresholds');
      console.log('   📊 Test on longer timeframes for more robust results');
    } else {
      console.log('   ⚠️  No configurations show positive returns');
      console.log('   🔧 Consider adjusting RSI thresholds or other parameters');
    }
  }
  
  console.log('\n🎉 ATR threshold optimization completed!\n');
}

// Run optimization
optimizeATRThresholds().catch(error => {
  console.error('❌ Optimization failed:', error);
});
