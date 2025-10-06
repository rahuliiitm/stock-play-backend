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

async function run10YearNoRsiExitsTest() {
  const logger = new Logger('10YearNoRsiExitsTest');
  
  console.log('🚀 Testing No RSI Exits Strategy - 10 Year Backtest');
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

    // 10-year configuration with no RSI exits
    const tenYearConfig = {
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
        // RSI parameters - NO EXITS
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 0, // DISABLED - no RSI exits
        rsiExitShort: 0, // DISABLED - no RSI exits
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

    console.log('📊 10-Year Configuration:');
    console.log(`   Period: 2015-2024 (10 years)`);
    console.log(`   Timeframe: 15 minutes`);
    console.log(`   RSI Entry: ${tenYearConfig.strategyConfig.rsiEntryLong}/${tenYearConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   RSI Exit: ${tenYearConfig.strategyConfig.rsiExitLong}/${tenYearConfig.strategyConfig.rsiExitShort} (DISABLED)`);
    console.log(`   Supertrend: ${tenYearConfig.strategyConfig.supertrendPeriod}, ${tenYearConfig.strategyConfig.supertrendMultiplier}`);
    console.log(`   Exit Strategy: Supertrend signals only`);
    console.log('');

    const results = await backtestOrchestrator.runBacktest(tenYearConfig);

    if (!results) {
      console.log('❌ No results returned from backtest');
      return;
    }

    console.log('📈 10-Year Results:');
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
    
    console.log('');
    console.log('🎯 Analysis:');
    
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

    // Check for mathematical inconsistencies
    if (results.losingTrades === 0 && results.maxDrawdown > 0) {
      console.log('   🚨 INCONSISTENCY: Max drawdown > 0 but no losing trades!');
    }
    
    console.log('');
    console.log('💡 Recommendations:');
    if (totalTrades < 100) {
      console.log('   1. Check if Supertrend signals are being generated properly');
      console.log('   2. Verify data availability for the full 10-year period');
      console.log('   3. Consider adjusting Supertrend parameters for more signals');
    }
    if (losingPercentage > 40) {
      console.log('   4. Add stop-loss protection');
      console.log('   5. Consider more conservative Supertrend settings');
    }
    if (winRate < 30) {
      console.log('   6. Optimize Supertrend parameters');
      console.log('   7. Add trend confirmation');
    }
    if (winRate > 50 && losingPercentage < 20 && totalTrades > 100) {
      console.log('   8. ✅ Strategy performing well!');
    }

    console.log('');
    console.log('🔍 Key Insights:');
    console.log('   - RSI exits completely removed');
    console.log('   - Strategy relies solely on Supertrend for exits');
    console.log('   - Should capture longer trends without premature exits');

  } catch (error) {
    console.error('❌ Error running 10-year no RSI exits test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

run10YearNoRsiExitsTest();
