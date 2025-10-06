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

class MockRepository extends Repository {
  constructor() {
    super();
  }
  async save(entity) { return entity; }
  create(entity) { return entity; }
  async findOne(options) { return null; }
}

/**
 * Optimized Risk/Reward Strategy Configuration
 * 
 * Key Improvements:
 * 1. Let winners run longer (8% ATR decline vs 5%)
 * 2. Cut losers quicker (tighter RSI exits)
 * 3. Add stop loss protection
 * 4. Better position sizing
 */
async function runOptimizedRiskRewardBacktest() {
  console.log('🎯 Running optimized risk/reward strategy to fix win/loss ratio...\n');

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

  // Optimized Configuration for Better Risk/Reward
  const optimizedConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-06-30T23:59:59.000Z',
    initialBalance: 100000,
    strategyConfig: {
      id: 'optimized-risk-reward-strategy',
      name: 'Optimized Risk/Reward ATR Strategy',
      symbol: 'NIFTY',
      timeframe: '15m',
      
      // EMA Parameters (unchanged)
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      
      // ATR Parameters (OPTIMIZED for better risk/reward)
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,        // 8% decline (was 5%) - let winners run longer
      atrExpansionThreshold: 0.01,      // 1% expansion (unchanged) - sensitive entry
      
      // RSI Parameters (OPTIMIZED for better exits)
      rsiPeriod: 14,
      rsiEntryLong: 30,                 // Entry thresholds (unchanged)
      rsiEntryShort: 70,                // Entry thresholds (unchanged)
      rsiExitLong: 35,                  // Tighter exit (was 25) - cut losers quicker
      rsiExitShort: 65,                 // Tighter exit (was 75) - cut losers quicker
      
      // Position Management (OPTIMIZED)
      maxLots: 8,                       // Reduced from 10 to 8 for better risk control
      pyramidingEnabled: true,
      exitMode: 'FIFO',
      
      // Risk Management (NEW)
      stopLossPct: 0.02,               // 2% stop loss per position
      maxLossPerTrade: 0.01,           // 1% max loss per trade
      positionSizeMultiplier: 1.0,     // Base position size
      
      // Other Parameters (unchanged)
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      
      // Time Exits (disabled for backtesting)
      misExitTime: null,
      cncExitTime: null,
    },
  };

  try {
    console.log('⚙️  Optimized Risk/Reward Configuration:');
    console.log(`   📊 ATR Decline Threshold: ${optimizedConfig.strategyConfig.atrDeclineThreshold * 100}% (was 5%)`);
    console.log(`   📊 ATR Expansion Threshold: ${optimizedConfig.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   📊 RSI Entry Long: ${optimizedConfig.strategyConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${optimizedConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   📊 RSI Exit Long: ${optimizedConfig.strategyConfig.rsiExitLong} (was 25)`);
    console.log(`   📊 RSI Exit Short: ${optimizedConfig.strategyConfig.rsiExitShort} (was 75)`);
    console.log(`   🔄 Pyramiding Enabled: ${optimizedConfig.strategyConfig.pyramidingEnabled}`);
    console.log(`   🚪 Exit Mode: ${optimizedConfig.strategyConfig.exitMode}`);
    console.log(`   📤 Max Lots: ${optimizedConfig.strategyConfig.maxLots} (was 10)`);
    console.log(`   🛡️  Stop Loss: ${optimizedConfig.strategyConfig.stopLossPct * 100}% per position`);
    console.log(`   🛡️  Max Loss Per Trade: ${optimizedConfig.strategyConfig.maxLossPerTrade * 100}%`);
    console.log(`   ⏰ Time Exits: ${optimizedConfig.strategyConfig.misExitTime === null && optimizedConfig.strategyConfig.cncExitTime === null ? 'Disabled' : 'Enabled'}\n`);

    console.log('🎯 Key Optimizations:');
    console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits)');
    console.log('   ✅ Added stop loss protection (2% per position)');
    console.log('   ✅ Reduced max lots for better risk control');
    console.log('   ✅ Added max loss per trade limit\n');

    const startTime = process.hrtime.bigint();
    const results = await orchestrator.runBacktest(optimizedConfig);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds

    console.log(`✅ Optimized risk/reward backtest completed in ${duration.toFixed(2)}s\n`);

    console.log(
      '================================================================================',
    );
    console.log('🎯 OPTIMIZED RISK/REWARD BACKTEST RESULTS');
    console.log(
      '================================================================================',
    );

    console.log('\n💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💵 Total Return: ${results.totalReturn.toFixed(2)}%`);
    console.log(`   💰 Final Balance: ₹${results.finalBalance.toFixed(2)}`);
    console.log(`   🎯 Win Rate: ${results.winRate.toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);

    console.log('\n📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);
    console.log(`   📊 Total P&L: ₹${results.totalProfitLoss.toFixed(2)}`);

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
    console.log('   ✅ Let winners run longer (8% ATR decline)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits)');
    console.log('   ✅ Added stop loss protection');
    console.log('   ✅ Better position sizing');
    console.log('   ✅ Reduced max lots for risk control');

    console.log('\n📈 EXPECTED IMPROVEMENTS:');
    console.log('   📊 Better Win/Loss Ratio: Let winners run, cut losers quick');
    console.log('   📊 Improved Risk Management: Stop losses and position limits');
    console.log('   📊 More Selective Trading: Reduced max lots');
    console.log('   📊 Better Exit Timing: Tighter RSI thresholds');

    console.log('\n🎉 Optimized risk/reward backtest completed!\n');
    
    // Return results for further analysis
    return {
      ...results,
      lossRatio,
      riskRewardRatio,
      optimized: true
    };

  } catch (error) {
    console.error('❌ Optimized risk/reward backtest failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

runOptimizedRiskRewardBacktest();
