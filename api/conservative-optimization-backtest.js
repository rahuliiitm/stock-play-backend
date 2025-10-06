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
 * Conservative Optimization Strategy Configuration
 * 
 * Key Improvements (without adding new parameters):
 * 1. Let winners run longer (8% ATR decline vs 5%)
 * 2. Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)
 * 3. Reduce max lots for better risk control (8 vs 10)
 * 4. Keep all existing parameters to avoid compatibility issues
 */
async function runConservativeOptimizationBacktest() {
  console.log('🎯 Running conservative optimization to fix win/loss ratio...\n');

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

  // Conservative Optimization Configuration (only existing parameters)
  const conservativeConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-06-30T23:59:59.000Z',
    initialBalance: 100000,
    strategyConfig: {
      id: 'conservative-optimization-strategy',
      name: 'Conservative Optimization ATR Strategy',
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
    console.log('⚙️  Conservative Optimization Configuration:');
    console.log(`   📊 ATR Decline Threshold: ${conservativeConfig.strategyConfig.atrDeclineThreshold * 100}% (was 5%)`);
    console.log(`   📊 ATR Expansion Threshold: ${conservativeConfig.strategyConfig.atrExpansionThreshold * 100}%`);
    console.log(`   📊 RSI Entry Long: ${conservativeConfig.strategyConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${conservativeConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   📊 RSI Exit Long: ${conservativeConfig.strategyConfig.rsiExitLong} (was 25)`);
    console.log(`   📊 RSI Exit Short: ${conservativeConfig.strategyConfig.rsiExitShort} (was 75)`);
    console.log(`   🔄 Pyramiding Enabled: ${conservativeConfig.strategyConfig.pyramidingEnabled}`);
    console.log(`   🚪 Exit Mode: ${conservativeConfig.strategyConfig.exitMode}`);
    console.log(`   📤 Max Lots: ${conservativeConfig.strategyConfig.maxLots} (was 10)`);
    console.log(`   ⏰ Time Exits: ${conservativeConfig.strategyConfig.misExitTime === null && conservativeConfig.strategyConfig.cncExitTime === null ? 'Disabled' : 'Enabled'}\n`);

    console.log('🎯 Conservative Optimizations:');
    console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)');
    console.log('   ✅ Reduce max lots for better risk control (8 vs 10)');
    console.log('   ✅ No new parameters to avoid compatibility issues\n');

    const startTime = process.hrtime.bigint();
    const results = await orchestrator.runBacktest(conservativeConfig);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds

    console.log(`✅ Conservative optimization backtest completed in ${duration.toFixed(2)}s\n`);

    console.log(
      '================================================================================',
    );
    console.log('🎯 CONSERVATIVE OPTIMIZATION BACKTEST RESULTS');
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

    console.log('\n🔧 CONSERVATIVE OPTIMIZATION IMPROVEMENTS:');
    console.log('   ✅ Let winners run longer (8% ATR decline vs 5%)');
    console.log('   ✅ Cut losers quicker (tighter RSI exits: 35/65 vs 25/75)');
    console.log('   ✅ Better risk control (reduced max lots: 8 vs 10)');
    console.log('   ✅ No new parameters (avoided compatibility issues)');

    console.log('\n📈 EXPECTED IMPROVEMENTS:');
    console.log('   📊 Better Win/Loss Ratio: Let winners run, cut losers quick');
    console.log('   📊 Improved Risk Management: Reduced position size');
    console.log('   📊 More Selective Trading: Fewer max lots');
    console.log('   📊 Better Exit Timing: Tighter RSI thresholds');

    console.log('\n🎉 Conservative optimization backtest completed!\n');
    
    // Return results for further analysis
    return {
      ...results,
      lossRatio,
      riskRewardRatio,
      optimized: true,
      optimizationType: 'conservative'
    };

  } catch (error) {
    console.error('❌ Conservative optimization backtest failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

runConservativeOptimizationBacktest();

