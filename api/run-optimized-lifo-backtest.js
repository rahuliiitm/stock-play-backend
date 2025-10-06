const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');

async function runOptimizedLifoBacktest() {
  console.log('🚀 RUNNING OPTIMIZED LIFO BACKTEST...\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const backtestOrchestrator = new BacktestOrchestratorService(dataProvider, orderExecution);

  // OPTIMIZED STRATEGY CONFIGURATION
  const optimizedConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'optimized-lifo-strategy',
      name: 'Optimized LIFO Strategy',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.01,
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 30,
      rsiEntryShort: 70,
      rsiExitLong: 35,
      rsiExitShort: 65,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 4, // REDUCED from 8 to 4
      pyramidingEnabled: true,
      exitMode: 'LIFO', // CHANGED from FIFO to LIFO
      misExitTime: null,
      cncExitTime: null
    }
  };

  try {
    console.log('📊 OPTIMIZATION CHANGES APPLIED:');
    console.log('   🔧 Max Lots: 8 → 4 (50% reduction)');
    console.log('   🔧 Exit Mode: FIFO → LIFO (cut losses, let winners run)');
    console.log('   🔧 Strategy: Advanced ATR with LIFO exits\n');

    console.log('📈 Running optimized backtest...\n');
    const results = await backtestOrchestrator.runBacktest(optimizedConfig);

    console.log('================================================================================');
    console.log('🎯 OPTIMIZED LIFO STRATEGY BACKTEST RESULTS');
    console.log('================================================================================\n');

    // Performance metrics
    console.log('💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);

    // Trade breakdown
    console.log('\n📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);

    // Risk/Reward analysis
    const lossRatio = Math.abs(results.averageLoss) / results.averageWin;
    const riskRewardRatio = results.averageWin / Math.abs(results.averageLoss);
    
    console.log('\n🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}x (target: >0.67x)`);
    console.log(`   📊 Win/Loss Balance: ${lossRatio < 1.5 ? '✅ GOOD' : '❌ POOR'}`);

    // Drawdown analysis
    console.log('\n📉 DRAWDOWN ANALYSIS:');
    console.log(`   📊 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    if (results.equityCurve && results.equityCurve.length > 0) {
      const equityValues = results.equityCurve.map(point => point.equity);
      const peakEquity = Math.max(...equityValues);
      const troughEquity = Math.min(...equityValues);
      const calculatedMaxDD = ((peakEquity - troughEquity) / peakEquity) * 100;
      console.log(`   📊 Peak Equity: ₹${peakEquity.toFixed(2)}`);
      console.log(`   📊 Trough Equity: ₹${troughEquity.toFixed(2)}`);
      console.log(`   📊 Calculated Max DD: ${calculatedMaxDD.toFixed(2)}%`);
    }

    // Optimization improvements
    console.log('\n🔧 OPTIMIZATION IMPROVEMENTS:');
    console.log('   ✅ Reduced maxLots: 8 → 4 (50% reduction in pyramiding)');
    console.log('   ✅ LIFO exits: Cut losses quick, let winners run');
    console.log('   ✅ Better risk management: Smaller position sizes');
    console.log('   ✅ Improved exit timing: LIFO preserves profitable entries');

    // Comparison with previous results
    console.log('\n📊 COMPARISON WITH PREVIOUS RESULTS:');
    console.log('   📈 Previous Return: -6.81% (FIFO, maxLots=8)');
    console.log(`   📈 Current Return: ${results.totalReturnPercentage.toFixed(2)}% (LIFO, maxLots=4)`);
    const improvement = results.totalReturnPercentage - (-6.81);
    console.log(`   📈 Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}%`);
    console.log(`   📊 Status: ${improvement > 0 ? '✅ IMPROVED' : '❌ WORSE'}`);

    // Math verification
    console.log('\n🧮 MATH VERIFICATION:');
    const expectedReturn = (results.winningTrades * results.averageWin) + (results.losingTrades * results.averageLoss);
    console.log(`   📊 Expected Return: ₹${expectedReturn.toFixed(2)}`);
    console.log(`   📊 Actual Return: ₹${results.totalReturn.toFixed(2)}`);
    console.log(`   📊 Difference: ₹${(results.totalReturn - expectedReturn).toFixed(2)}`);
    console.log(`   📊 Math Check: ${Math.abs(results.totalReturn - expectedReturn) < 1 ? '✅ CORRECT' : '❌ DISCREPANCY'}`);

    // Detailed Loss Analysis
    console.log('\n🔍 DETAILED LOSS ANALYSIS:');
    
    if (results.trades && results.trades.length > 0) {
      const trades = results.trades;
      
      // 1. Pyramiding Impact Analysis
      console.log('\n📊 1. PYRAMIDING IMPACT:');
      
      // Group trades by direction and analyze sequences
      const longTrades = trades.filter(t => t.direction === 'LONG');
      const shortTrades = trades.filter(t => t.direction === 'SHORT');
      
      console.log(`   📊 Long Trades: ${longTrades.length}, Avg P&L: ₹${(longTrades.reduce((sum, t) => sum + t.pnl, 0) / longTrades.length).toFixed(2)}`);
      console.log(`   📊 Short Trades: ${shortTrades.length}, Avg P&L: ₹${(shortTrades.reduce((sum, t) => sum + t.pnl, 0) / shortTrades.length).toFixed(2)}`);
      
      // Analyze trade timing
      const recentTrades = trades.slice(-20); // Last 20 trades
      const recentPnl = recentTrades.reduce((sum, t) => sum + t.pnl, 0);
      console.log(`   📊 Recent 20 Trades P&L: ₹${recentPnl.toFixed(2)}`);
      
      // 2. Entry Timing Analysis
      console.log('\n📊 2. ENTRY TIMING:');
      
      // Analyze trade duration
      const shortDurationTrades = trades.filter(t => t.duration < 3600000); // < 1 hour
      const mediumDurationTrades = trades.filter(t => t.duration >= 3600000 && t.duration < 14400000); // 1-4 hours
      const longDurationTrades = trades.filter(t => t.duration >= 14400000); // > 4 hours
      
      console.log(`   📊 Short Trades (<1h): ${shortDurationTrades.length}, Avg P&L: ₹${(shortDurationTrades.reduce((sum, t) => sum + t.pnl, 0) / shortDurationTrades.length || 0).toFixed(2)}`);
      console.log(`   📊 Medium Trades (1-4h): ${mediumDurationTrades.length}, Avg P&L: ₹${(mediumDurationTrades.reduce((sum, t) => sum + t.pnl, 0) / mediumDurationTrades.length || 0).toFixed(2)}`);
      console.log(`   📊 Long Trades (>4h): ${longDurationTrades.length}, Avg P&L: ₹${(longDurationTrades.reduce((sum, t) => sum + t.pnl, 0) / longDurationTrades.length || 0).toFixed(2)}`);
      
      // 3. Loss Pattern Analysis
      console.log('\n📊 3. LOSS PATTERNS:');
      
      // Find consecutive losses
      let consecutiveLosses = 0;
      let maxConsecutiveLosses = 0;
      let currentConsecutiveLosses = 0;
      
      for (const trade of trades) {
        if (trade.pnl < 0) {
          currentConsecutiveLosses++;
        } else {
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
          currentConsecutiveLosses = 0;
        }
      }
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
      
      console.log(`   📊 Max Consecutive Losses: ${maxConsecutiveLosses}`);
      
      // Large losses
      const largeLosses = trades.filter(t => t.pnl < -200);
      const veryLargeLosses = trades.filter(t => t.pnl < -500);
      
      console.log(`   📊 Large Losses (>₹200): ${largeLosses.length}`);
      console.log(`   📊 Very Large Losses (>₹500): ${veryLargeLosses.length}`);
      
      if (veryLargeLosses.length > 0) {
        console.log('   📊 Very Large Losses:');
        veryLargeLosses.slice(0, 5).forEach((trade, i) => {
          console.log(`      ${i+1}. ${trade.direction}: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`);
        });
      }
      
      // 4. LIFO vs FIFO Analysis
      console.log('\n📊 4. LIFO EXIT ANALYSIS:');
      console.log('   📊 LIFO Benefits:');
      console.log('      ✅ Cuts losses quickly (exits newest positions first)');
      console.log('      ✅ Preserves profitable early entries');
      console.log('      ✅ Better for pyramiding strategies');
      console.log('      ✅ Reduces maximum drawdown');
      
      // Pyramiding analysis
      if (trades.length > 100) {
        console.log('   🔍 PYRAMIDING IMPACT: Reduced trade frequency with maxLots=4');
        console.log('   🔧 SOLUTION: LIFO exits should improve performance');
      }
      
      // Recommendations
      console.log('\n🎯 OPTIMIZATION RESULTS:');
      
      if (maxConsecutiveLosses > 5) {
        console.log('   ❌ LOSS STREAKS: Still have long losing streaks');
        console.log('   🔧 NEXT: Add position sizing rules or stop trading after consecutive losses');
      }
      
      if (veryLargeLosses.length > 0) {
        console.log('   ❌ LARGE LOSSES: Still have individual trades causing significant damage');
        console.log('   🔧 NEXT: Tighten stop-loss or reduce position size further');
      }
      
      if (results.winRate < 0.5) {
        console.log('   ❌ LOW WIN RATE: Still more losing trades than winning trades');
        console.log('   🔧 NEXT: Tighten entry criteria or improve exit timing');
      }
      
      if (results.profitFactor < 1) {
        console.log('   ❌ NEGATIVE PROFIT FACTOR: Still losing more than winning');
        console.log('   🔧 NEXT: Focus on improving risk/reward ratio');
      }
      
      console.log('\n💡 NEXT OPTIMIZATION STEPS:');
      console.log('   1. Tighten RSI entry criteria (25/75 instead of 30/70)');
      console.log('   2. Add position sizing based on consecutive losses');
      console.log('   3. Add maximum drawdown stop (e.g., stop trading at -10%)');
      console.log('   4. Consider separate long/short parameters');
    }

    console.log('\n🎉 Optimized LIFO strategy backtest completed!\n');
    
    // Return results for further analysis
    return {
      ...results,
      lossRatio,
      riskRewardRatio,
      improvement
    };

  } catch (error) {
    console.error('❌ Optimized backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

runOptimizedLifoBacktest().catch(console.error);
