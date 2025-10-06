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

async function runConservativeExitsTest() {
  console.log('🚀 Testing Conservative RSI Exits (70/30) Strategy');
  console.log('================================================');

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

    // Conservative RSI configuration
    const conservativeConfig = {
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
        rsiExitLong: 70,  // More conservative than 65
        rsiExitShort: 30, // More conservative than 35
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
    console.log(`   RSI Entry: ${conservativeConfig.strategyConfig.rsiEntryLong}/${conservativeConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   RSI Exit: ${conservativeConfig.strategyConfig.rsiExitLong}/${conservativeConfig.strategyConfig.rsiExitShort}`);
    console.log(`   Supertrend: ${conservativeConfig.strategyConfig.supertrendPeriod}, ${conservativeConfig.strategyConfig.supertrendMultiplier}`);
    console.log('');

    const results = await backtestOrchestrator.runBacktest(conservativeConfig);

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
      console.log('   1. Try even more aggressive RSI exits (75/25)');
      console.log('   2. Add stop-loss protection');
    }
    if (winRate < 30) {
      console.log('   3. Consider even less aggressive RSI exits (75/25)');
      console.log('   4. Add trend confirmation');
    }
    if (winRate > 50 && losingPercentage < 20) {
      console.log('   5. ✅ Strategy performing well!');
    }

  } catch (error) {
    console.error('❌ Error running conservative exits test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

runConservativeExitsTest();


