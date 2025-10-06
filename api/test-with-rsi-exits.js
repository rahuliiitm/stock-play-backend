const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');
const { BacktestValidationService } = require('./dist/src/modules/backtest/services/backtest-validation.service');
const { BacktestSafetyService } = require('./dist/src/modules/backtest/services/backtest-safety.service');
const { BacktestDataService } = require('./dist/src/modules/backtest/services/backtest-data.service');
const { BacktestMetricsService } = require('./dist/src/modules/backtest/services/backtest-metrics.service');
const { ExitStrategyFactory } = require('./dist/src/modules/strategy/strategies/exit-strategy-factory');
const { TrailingStopService } = require('./dist/src/modules/strategy/components/trailing-stop.service');
const { EmaGapAtrStrategyService } = require('./dist/src/modules/strategy/services/ema-gap-atr-strategy.service');
const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
const { StrategyBuildingBlocksService } = require('./dist/src/modules/strategy/services/strategy-building-blocks.service');
const { Logger } = require('@nestjs/common');

async function testWithRsiExits() {
  const logger = new Logger('TestWithRsiExits');
  
  console.log('🚀 Testing WITH RSI Exits Strategy - 10 Year Backtest');
  console.log('=====================================================');

  try {
    // Initialize services
    const dataProvider = new CsvDataProvider();
    const orderExecution = new MockOrderExecutionProvider();
    const validationService = new BacktestValidationService();
    const safetyService = new BacktestSafetyService();
    const dataService = new BacktestDataService(dataProvider);
    const metricsService = new BacktestMetricsService();
    const exitStrategyFactory = new ExitStrategyFactory();
    const trailingStopService = new TrailingStopService(logger);
    const strategyBuildingBlocksService = new StrategyBuildingBlocksService();
    const emaGapAtrStrategyService = new EmaGapAtrStrategyService(strategyBuildingBlocksService, logger);
    const advancedATRStrategyService = new AdvancedATRStrategyService(strategyBuildingBlocksService, logger);

    const backtestOrchestrator = new BacktestOrchestratorService(
      dataProvider,
      orderExecution,
      emaGapAtrStrategyService,
      advancedATRStrategyService,
      validationService,
      safetyService,
      dataService,
      metricsService,
      exitStrategyFactory,
      trailingStopService
    );

    // 10-year configuration WITH RSI exits
    const withRsiExitsConfig = {
      strategyName: 'advanced-atr',
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2015-01-01T09:15:00Z',
      endDate: '2024-12-31T15:30:00Z',
      initialBalance: 100000,
      strategyConfig: {
        // EMA parameters (required by safety service)
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        // Supertrend parameters
        supertrendPeriod: 10,
        supertrendMultiplier: 2,
        // RSI parameters - WITH EXITS
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 65, // ENABLED - exit long at RSI 65
        rsiExitShort: 35, // ENABLED - exit short at RSI 35
        // ATR parameters
        atrPeriod: 14,
        atrMultiplier: 2,
        // Pyramiding disabled
        pyramidingEnabled: false,
        maxPyramidingPositions: 1,
        // Exit mode
        exitMode: 'FIFO',
        // Position sizing and risk management
        maxLots: 10,
        maxLossPct: 0.05,
        positionSize: 1,
        // Trailing Stop Loss
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2,
        trailingStopActivationProfit: 0.01, // 1% profit to activate trailing stop
        maxTrailDistance: 0.05, // Max 5% trail distance from peak/trough
        // ATR-based entry/exit logic (disabled for now)
        atrRequiredForEntry: false,
        atrExpansionThreshold: 0,
        atrDeclineThreshold: 0,
      }
    };

    console.log('📊 10-Year Configuration WITH RSI Exits:');
    console.log(`   Period: 2015-2024 (10 years)`);
    console.log(`   Timeframe: 15 minutes`);
    console.log(`   RSI Entry: ${withRsiExitsConfig.strategyConfig.rsiEntryLong}/${withRsiExitsConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   RSI Exit: ${withRsiExitsConfig.strategyConfig.rsiExitLong}/${withRsiExitsConfig.strategyConfig.rsiExitShort} (ENABLED)`);
    console.log(`   Supertrend: ${withRsiExitsConfig.strategyConfig.supertrendPeriod}, ${withRsiExitsConfig.strategyConfig.supertrendMultiplier}`);
    console.log(`   Exit Strategy: Supertrend + RSI signals`);
    console.log('');

    const results = await backtestOrchestrator.runBacktest(withRsiExitsConfig);

    if (!results) {
      console.log('❌ No results returned from backtest');
      return;
    }

    console.log('📈 10-Year Results WITH RSI Exits:');
    console.log(`   Total Trades: ${results.totalTrades || 0}`);
    console.log(`   Winning Trades: ${results.winningTrades || 0}`);
    console.log(`   Losing Trades: ${results.losingTrades || 0}`);
    console.log(`   Win Rate: ${((results.winRate || 0) * 100).toFixed(2)}%`);
    console.log(`   Losing Trade %: ${((results.losingTrades || 0) / (results.totalTrades || 1) * 100).toFixed(1)}%`);
    console.log(`   Total Return: ₹${(results.totalReturn || 0).toFixed(2)} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
    console.log(`   Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
    console.log(`   Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
    console.log(`   Max Win: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`   Max Loss: ₹${(results.maxLoss || 0).toFixed(2)}`);
    console.log(`   Max Drawdown: ${((results.maxDrawdown || 0) * 100).toFixed(2)}%`);
    console.log(`   Initial Capital: ₹${(results.initialCapital || 0).toFixed(2)}`);
    console.log(`   Final Capital: ₹${(results.finalCapital || 0).toFixed(2)}`);
    
    // Analysis
    const losingPercentage = (results.losingTrades || 0) / (results.totalTrades || 1) * 100;
    const winRate = (results.winRate || 0) * 100;
    const totalTrades = results.totalTrades || 0;
    const breakEvenTrades = totalTrades - (results.winningTrades || 0) - (results.losingTrades || 0);
    
    console.log('');
    console.log('🎯 Analysis:');
    console.log(`   Break-Even Trades: ${breakEvenTrades} (${(breakEvenTrades / totalTrades * 100).toFixed(1)}%)`);
    
    if (totalTrades < 100) {
      console.log('   ⚠️  WARNING: Very low trade frequency for 10 years');
      console.log(`   📊 Expected: ~1000+ trades, Got: ${totalTrades}`);
    }
    
    if (losingPercentage < 20) {
      console.log('   ✅ EXCELLENT: Losing trades under 20%');
    } else if (losingPercentage < 40) {
      console.log('   ✅ GOOD: Losing trades under 40%');
    } else {
      console.log('   ❌ HIGH: Losing trades over 40%');
    }
    
    if (winRate > 50) {
      console.log('   ✅ EXCELLENT: Win rate over 50%');
    } else if (winRate > 30) {
      console.log('   ✅ GOOD: Win rate over 30%');
    } else {
      console.log('   ❌ POOR: Win rate under 30%');
    }

    // Compare with previous results
    console.log('');
    console.log('📊 Comparison with NO RSI Exits:');
    console.log('   Previous (No RSI): 1,039 trades, 33.11% win rate, -5.53% return');
    console.log(`   Current (With RSI): ${totalTrades} trades, ${winRate.toFixed(2)}% win rate, ${(results.totalReturnPercentage || 0).toFixed(2)}% return`);
    
    if ((results.totalReturnPercentage || 0) > -5.53) {
      console.log('   ✅ IMPROVEMENT: RSI exits improved performance');
    } else {
      console.log('   ❌ WORSE: RSI exits made performance worse');
    }
    
    console.log('');
    console.log('💡 Recommendations:');
    if (breakEvenTrades > totalTrades * 0.2) {
      console.log('   1. Reduce break-even trades by optimizing entry/exit timing');
    }
    if (losingPercentage > 40) {
      console.log('   2. Add stop-loss protection');
      console.log('   3. Consider more conservative RSI exit thresholds');
    }
    if (winRate < 30) {
      console.log('   4. Optimize RSI exit thresholds (try 60/40 or 70/30)');
      console.log('   5. Add trend confirmation');
    }
    if (winRate > 50 && losingPercentage < 20) {
      console.log('   6. ✅ Strategy performing well!');
    }

    console.log('');
    console.log('🔍 Key Insights:');
    console.log('   - RSI exits re-enabled (65/35)');
    console.log('   - Should capture profits before they turn to losses');
    console.log('   - Should reduce break-even trades');

  } catch (error) {
    console.error('❌ Error running with RSI exits test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testWithRsiExits();


