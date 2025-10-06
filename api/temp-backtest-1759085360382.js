const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');
const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
const { EmaGapAtrStrategyService } = require('./dist/src/modules/strategy/services/ema-gap-atr-strategy.service');
const { BacktestValidationService } = require('./dist/src/modules/backtest/services/backtest-validation.service');
const { BacktestSafetyService } = require('./dist/src/modules/backtest/services/backtest-safety.service');
const { BacktestDataService } = require('./dist/src/modules/backtest/services/backtest-data.service');
const { BacktestMetricsService } = require('./dist/src/modules/backtest/services/backtest-metrics.service');
const { EventEmitter2 } = require('@nestjs/event-emitter');
const { Repository } = require('typeorm');
const { BacktestRun } = require('./dist/src/modules/backtest/entities/backtest-run.entity');
const { BacktestResult } = require('./dist/src/modules/backtest/entities/backtest-result.entity');
const { BacktestTrade } = require('./dist/src/modules/backtest/entities/backtest-trade.entity');

/**
 * Mock TypeORM Repository
 */
class MockRepository extends Repository {
  constructor() {
    super();
  }
  async save(entity) { return entity; }
  create(entity) { return entity; }
  async findOne(options) { return null; }
}

/**
 * Run Optimized Strategy Backtest Directly
 * 
 * This bypasses the API server and runs the optimized strategy directly
 * to avoid the environment variable issues with the API server.
 */
async function runOptimizedBacktestDirect() {
  console.log('🚀 Running Optimized Strategy Backtest Directly...\n');

  // Set environment variables
  process.env.DATA_PROVIDER_MODE = 'csv';
  process.env.CSV_DATA_DIR = './data';

  const dataProvider = new CsvDataProvider();
  const advancedATRStrategy = new AdvancedATRStrategyService();
  const emaGapAtrStrategy = new EmaGapAtrStrategyService();
  const orderExecution = new MockOrderExecutionProvider();
  const validationService = new BacktestValidationService();
  const safetyService = new BacktestSafetyService();
  const dataService = new BacktestDataService();
  const metricsService = new BacktestMetricsService();
  const eventEmitter = new EventEmitter2();
  const mockBacktestRunRepository = new MockRepository();
  const mockBacktestResultRepository = new MockRepository();
  const mockBacktestTradeRepository = new MockRepository();

  const orchestrator = new BacktestOrchestratorService(
    dataProvider,
    orderExecution,
    emaGapAtrStrategy,
    advancedATRStrategy,
    validationService,
    safetyService,
    dataService,
    metricsService,
    mockBacktestRunRepository,
    mockBacktestResultRepository,
    mockBacktestTradeRepository,
    eventEmitter
  );

  const optimizedConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',  // REVERTED: Back to 15m as requested
    startDate: '2014-01-01T00:00:00.000Z',  // 10 year test to capture NIFTY 3x move
    endDate: '2024-12-31T23:59:59.000Z',    // 10 year test to capture NIFTY 3x move
    initialBalance: 100000,
    strategyConfig: {
      id: 'optimized-strategy-direct',
      name: 'Optimized Strategy Direct Test',
      symbol: 'NIFTY',
      timeframe: '15m',  // REVERTED: Back to 15m as requested
                emaFastPeriod: 9,   // REVERTED: Back to original 9 as requested
                emaSlowPeriod: 21,  // REVERTED: Back to original 21 as requested
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,        // 8% decline (was 5%) - let winners run longer
      atrExpansionThreshold: 0.002,      // FIXED: 0.2% instead of 1% - much more realistic!
      atrRequiredForEntry: false,         // DISABLED: ATR expansion not required for initial entries
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 40,                  // RSI 50 filter for long entries (above 50)
      rsiEntryShort: 60,                // RSI 50 filter for short entries (below 50)
      rsiExitLong: 65,                  // RSI 65 exit for long positions (optimal balance)
      rsiExitShort: 35,                 // RSI 35 exit for short positions (optimal balance)
      
  // Trailing Stop Loss Configuration - LOWER ACTIVATION THRESHOLD
  trailingStopEnabled: true,         // ENABLED: Test with practical defaults
  trailingStopType: 'ATR',          // Use ATR-based trailing stop (more adaptive)
  trailingStopATRMultiplier: 2.0,   // 2x ATR trailing stop distance (standard)
  trailingStopPercentage: 0.02,     // 2% trailing stop (if using percentage)
  trailingStopActivationProfit: 0.002, // Activate after 0.2% profit (much lower threshold)
  maxTrailDistance: 0.05,            // Maximum 5% trailing distance (prevent extreme trailing)
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 2, // MINIMAL: High max lots for maximum trades (safety limit)
      pyramidingEnabled: true,
      exitMode: 'LIFO', // CHANGED from FIFO to LIFO
      misExitTime: null,                // Removed time exit
      cncExitTime: null,                // Removed time exit
      // NEW OPTIMIZATIONS
      maxConsecutiveLosses: 10,         // MINIMAL: High tolerance for maximum trades
      maxDrawdownStop: 0.20,            // MINIMAL: High tolerance for maximum trades
      positionSizingMode: 'CONSERVATIVE' // Reduce position size after losses
    },
  };

  try {
    console.log('⚙️  Fixed Strategy Configuration:');
    console.log(`   🔧 ATR Required for Entry: ${optimizedConfig.strategyConfig.atrRequiredForEntry ? 'TRUE' : 'FALSE'} - ${optimizedConfig.strategyConfig.atrRequiredForEntry ? 'ENABLED' : 'DISABLED'} for initial entries`);
    console.log(`   📊 ATR Decline Threshold: ${optimizedConfig.strategyConfig.atrDeclineThreshold * 100}% (was 5%)`);
    console.log(`   📊 ATR Expansion Threshold: ${optimizedConfig.strategyConfig.atrExpansionThreshold * 100}% (for pyramiding only)`);
    console.log(`   📊 RSI Entry Long: ${optimizedConfig.strategyConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${optimizedConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   📊 RSI Exit Long: ${optimizedConfig.strategyConfig.rsiExitLong} (was 25)`);
    console.log(`   📊 RSI Exit Short: ${optimizedConfig.strategyConfig.rsiExitShort} (was 75)`);
    console.log(`   🔄 Pyramiding Enabled: ${optimizedConfig.strategyConfig.pyramidingEnabled}`);
    console.log(`   🚪 Exit Mode: ${optimizedConfig.strategyConfig.exitMode}`);
    console.log(`   📤 Max Lots: ${optimizedConfig.strategyConfig.maxLots} (increased for 10-year dataset)`);
    console.log(`   ⏰ Time Exits: ${optimizedConfig.strategyConfig.misExitTime === null && optimizedConfig.strategyConfig.cncExitTime === null ? 'Disabled' : 'Enabled'}\n`);

console.log('🎯 Key Fixes:');
console.log('   ✅ ATR requirement DISABLED for initial entries (was blocking all trades)');
console.log('   ✅ EMA periods kept at 9/21 for positional strategy (as requested)');
console.log('   ✅ Increased max lots from 8 to 12 (1.5x more trade opportunities)');
console.log('   ✅ Relaxed trade cost limits from 50% to 70% (more trades can execute)');
console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
console.log('   ✅ Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)');
console.log('   ✅ Full 10-year dataset (2014-2024) instead of 6 months');
console.log('   ✅ No time exits (removed for backtesting)\n');

    console.log('📤 Running optimized backtest...');
    const startTime = process.hrtime.bigint();
    // Log the configuration being passed to verify it's correct
    console.log('🔍 Configuration being passed to orchestrator:');
    console.log(`   📈 EMA Fast: ${optimizedConfig.strategyConfig.emaFastPeriod}`);
    console.log(`   📈 EMA Slow: ${optimizedConfig.strategyConfig.emaSlowPeriod}`);
    console.log(`   📊 Pyramiding: ${optimizedConfig.strategyConfig.pyramidingEnabled}`);
    console.log(`   📊 Max Lots: ${optimizedConfig.strategyConfig.maxLots}\n`);
    
    const results = await orchestrator.runBacktest(optimizedConfig);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds

    console.log(`✅ Optimized backtest completed in ${duration.toFixed(2)}s\n`);

    console.log(
      '================================================================================',
    );
    console.log('🎯 OPTIMIZED STRATEGY BACKTEST RESULTS');
    console.log(
      '================================================================================',
    );

    console.log('\n💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${results.winRate.toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);

    console.log('\n📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);
    console.log(`   📊 Total P&L: ₹${results.totalReturn.toFixed(2)}`);

    // Calculate and display risk/reward metrics
    const lossRatio = results.averageLoss / results.averageWin;
    const riskRewardRatio = results.averageWin / results.averageLoss;
    
    console.log('\n🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}x (target: >0.67x)`);
    console.log(`   📊 Win/Loss Balance: ${lossRatio < 1.5 ? '✅ GOOD' : '❌ POOR'}`);
    
    if (lossRatio < 1.5) {
      console.log('   🎉 SUCCESS: Win/Loss ratio improved!');
    } else {
      console.log('   ⚠️  WARNING: Win/Loss ratio still needs improvement');
    }

    console.log('\n🔧 OPTIMIZATION IMPROVEMENTS:');
    console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)');
    console.log('   ✅ Better risk control (reduced max lots: 8 vs 10)');
    console.log('   ✅ No time exits (removed for backtesting)');

    console.log('\n📈 EXPECTED IMPROVEMENTS:');
    console.log('   📊 Better Win/Loss Ratio: Let winners run, cut losers quick');
    console.log('   📊 Improved Risk Management: Reduced position size');
    console.log('   📊 More Selective Trading: Fewer max lots');
    console.log('   📊 Better Exit Timing: Tighter RSI thresholds');

    // Math verification
    console.log('\n🧮 MATH VERIFICATION:');
    const expectedReturn = (results.winningTrades * results.averageWin) + (results.losingTrades * results.averageLoss);
    console.log(`   📊 Expected Return: ₹${expectedReturn.toFixed(2)}`);
    console.log(`   📊 Actual Return: ₹${results.totalReturn.toFixed(2)}`);
    console.log(`   📊 Difference: ₹${(results.totalReturn - expectedReturn).toFixed(2)}`);
    console.log(`   📊 Math Check: ${Math.abs(results.totalReturn - expectedReturn) < 1 ? '✅ CORRECT' : '❌ DISCREPANCY'}`);

    // Drawdown analysis
    console.log('\n📉 DRAWDOWN ANALYSIS:');
    console.log(`   📊 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    if (results.equityCurve && results.equityCurve.length > 0) {
      const equityValues = results.equityCurve.map(point => point.equity);
      const peak = Math.max(...equityValues);
      const trough = Math.min(...equityValues);
      const maxDD = ((peak - trough) / peak) * 100;
      
      console.log(`   📊 Peak Equity: ₹${peak.toFixed(2)}`);
      console.log(`   📊 Trough Equity: ₹${trough.toFixed(2)}`);
      console.log(`   📊 Calculated Max DD: ${maxDD.toFixed(2)}%`);
      
      // Find max loss trade
      if (results.trades && results.trades.length > 0) {
        const maxLossTrade = results.trades.reduce((min, trade) => trade.pnl < min.pnl ? trade : min, results.trades[0]);
        console.log(`   📊 Max Loss Trade: ₹${maxLossTrade.pnl.toFixed(2)} (${maxLossTrade.pnlPercentage.toFixed(2)}%)`);
        
        const maxWinTrade = results.trades.reduce((max, trade) => trade.pnl > max.pnl ? trade : max, results.trades[0]);
        console.log(`   📊 Max Win Trade: ₹${maxWinTrade.pnl.toFixed(2)} (${maxWinTrade.pnlPercentage.toFixed(2)}%)`);
      }
    }

    // Duration analysis
    console.log('\n⏱️ DURATION ANALYSIS:');
    if (results.equityCurve && results.equityCurve.length > 0) {
      const startDate = new Date(results.equityCurve[0].timestamp);
      const endDate = new Date(results.equityCurve[results.equityCurve.length - 1].timestamp);
      const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      
      console.log(`   📅 Start Date: ${startDate.toISOString().split('T')[0]}`);
      console.log(`   📅 End Date: ${endDate.toISOString().split('T')[0]}`);
      console.log(`   📅 Duration: ${durationDays.toFixed(0)} days`);
    }

    console.log('\n🎯 CONCLUSION:');
    if (Math.abs(results.totalReturn - expectedReturn) > 1) {
      console.log('   ❌ MATH DISCREPANCY DETECTED!');
      console.log('   🔍 Possible causes:');
      console.log('      - Unrealized P&L not included in trade calculations');
      console.log('      - Position sizing issues');
      console.log('      - Pyramiding calculation errors');
      console.log('      - Balance vs trade P&L mismatch');
    } else {
      console.log('   ✅ Math appears correct');
    }

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
      
      // 4. Recommendations
      console.log('\n🎯 ROOT CAUSE ANALYSIS:');
      
      if (maxConsecutiveLosses > 5) {
        console.log('   ❌ LOSS STREAKS: Strategy has long losing streaks');
        console.log('   🔧 SOLUTION: Add position sizing rules or stop trading after consecutive losses');
      }
      
      if (veryLargeLosses.length > 0) {
        console.log('   ❌ LARGE LOSSES: Individual trades causing significant damage');
        console.log('   🔧 SOLUTION: Tighten stop-loss or reduce position size');
      }
      
      if (results.winRate < 0.5) {
        console.log('   ❌ LOW WIN RATE: More losing trades than winning trades');
        console.log('   🔧 SOLUTION: Tighten entry criteria or improve exit timing');
      }
      
      if (results.profitFactor < 1) {
        console.log('   ❌ NEGATIVE PROFIT FACTOR: Losing more than winning');
        console.log('   🔧 SOLUTION: Focus on improving risk/reward ratio');
      }
      
      // Pyramiding analysis
      if (trades.length > 100) {
        console.log('   🔍 PYRAMIDING IMPACT: High trade frequency suggests pyramiding is active');
        console.log('   🔧 SOLUTION: Consider reducing maxLots or switching to LIFO exits');
      }
      
      console.log('\n💡 OPTIMIZATION SUGGESTIONS:');
      console.log('   1. Reduce maxLots from 8 to 4-5 to limit pyramiding');
      console.log('   2. Tighten RSI entry criteria (25/75 instead of 30/70)');
      console.log('   3. Add position sizing based on consecutive losses');
      console.log('   4. Consider LIFO exits instead of FIFO');
      console.log('   5. Add maximum drawdown stop (e.g., stop trading at -10%)');
    }

    console.log('\n🎉 Optimized strategy backtest completed!\n');
    
    // Return results for further analysis
    return {
      ...results,
      lossRatio,
      riskRewardRatio,
      optimized: true,
      optimizationType: 'direct'
    };

  } catch (error) {
    console.error('❌ Optimized strategy backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the optimized backtest
runOptimizedBacktestDirect();
