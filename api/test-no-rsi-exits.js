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

async function runNoRsiExitsTest() {
  console.log('🚀 Testing No RSI Exits Strategy (Supertrend Only)');
  console.log('==================================================');

  try {
    // Initialize services
    const dataProvider = new CsvDataProvider();
    const orderExecution = new MockOrderExecutionProvider();
    const validationService = new BacktestValidationService();
    const safetyService = new BacktestSafetyService();
    const dataService = new BacktestDataService(dataProvider);
    const metricsService = new BacktestMetricsService();
    const exitStrategyFactory = new ExitStrategyFactory();
    const trailingStopService = new TrailingStopService();
    const emaGapAtrStrategyService = new EmaGapAtrStrategyService();
    const advancedATRStrategyService = new AdvancedATRStrategyService();

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

    // No RSI exits configuration - rely only on Supertrend
    const noRsiExitsConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
      initialBalance: 100000,
      strategy: 'advanced-atr',
      strategyConfig: {
        supertrendPeriod: 10,
        supertrendMultiplier: 2,
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 0,  // Disabled - no RSI exits
        rsiExitShort: 0, // Disabled - no RSI exits
        atrPeriod: 14,
        pyramidingEnabled: false,
        maxPyramidingPositions: 1,
        exitMode: 'FIFO',
        maxLots: 10,
        maxLossPct: 0.05,
        positionSize: 1,
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2,
        trailingStopActivationProfit: 0.01,
        atrRequiredForEntry: false,
        atrExpansionThreshold: 0,
        atrDeclineThreshold: 0,
      },
      advancedConfig: {
        maxTrailDistance: 0.05,
      },
    };

    console.log('📊 Configuration:');
    console.log(`   RSI Entry: ${noRsiExitsConfig.strategyConfig.rsiEntryLong}/${noRsiExitsConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   RSI Exit: ${noRsiExitsConfig.strategyConfig.rsiExitLong}/${noRsiExitsConfig.strategyConfig.rsiExitShort} (DISABLED)`);
    console.log(`   Supertrend: ${noRsiExitsConfig.strategyConfig.supertrendPeriod}, ${noRsiExitsConfig.strategyConfig.supertrendMultiplier}`);
    console.log(`   Exit Strategy: Supertrend signals only`);
    console.log('');

    const results = await backtestOrchestrator.runBacktest(noRsiExitsConfig);

    if (!results) {
      console.log('❌ No results returned from backtest');
      return;
    }

    console.log('📈 Results:');
    console.log(`   Total Trades: ${results.totalTrades || 0}`);
    console.log(`   Winning Trades: ${results.winningTrades || 0}`);
    console.log(`   Losing Trades: ${results.losingTrades || 0}`);
    console.log(`   Win Rate: ${((results.winRate || 0) * 100).toFixed(2)}%`);
    console.log(`   Losing Trade %: ${((results.losingTrades || 0) / (results.totalTrades || 1) * 100).toFixed(1)}%`);
    console.log(`   Total Return: ₹${(results.totalReturn || 0).toFixed(2)} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
    console.log(`   Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
    console.log(`   Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
    console.log(`   Max Drawdown: ${((results.maxDrawdown || 0) * 100).toFixed(2)}%`);
    
    // Analysis
    const losingPercentage = (results.losingTrades || 0) / (results.totalTrades || 1) * 100;
    const winRate = (results.winRate || 0) * 100;
    
    console.log('');
    console.log('🎯 Analysis:');
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
    
    console.log('');
    console.log('💡 Recommendations:');
    if (losingPercentage > 40) {
      console.log('   1. Add stop-loss protection');
      console.log('   2. Consider more conservative Supertrend settings');
    }
    if (winRate < 30) {
      console.log('   3. Optimize Supertrend parameters');
      console.log('   4. Add trend confirmation');
    }
    if (winRate > 50 && losingPercentage < 20) {
      console.log('   5. ✅ Strategy performing well!');
    }

    console.log('');
    console.log('🔍 Key Insights:');
    console.log('   - RSI exits removed - trades rely on Supertrend signals only');
    console.log('   - This should eliminate immediate exit problem');
    console.log('   - Trades should run longer and capture more trend');

  } catch (error) {
    console.error('❌ Error running no RSI exits test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

runNoRsiExitsTest();


