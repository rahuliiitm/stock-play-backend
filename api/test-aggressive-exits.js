const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution-provider');
const { BacktestValidationService } = require('./dist/src/modules/backtest/services/backtest-validation.service');
const { BacktestSafetyService } = require('./dist/src/modules/backtest/services/backtest-safety.service');
const { BacktestDataService } = require('./dist/src/modules/backtest/services/backtest-data.service');
const { BacktestMetricsService } = require('./dist/src/modules/backtest/services/backtest-metrics.service');
const { ExitStrategyFactory } = require('./dist/src/modules/strategy/strategies/exit-strategy-factory');
const { TrailingStopService } = require('./dist/src/modules/strategy/components/trailing-stop.service');
const { EmaGapAtrStrategyService } = require('./dist/src/modules/strategy/services/ema-gap-atr-strategy.service');
const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');

async function testAggressiveExits() {
  console.log('🚀 Testing Aggressive RSI Exits to Reduce Losing Trades...\n');

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const validationService = new BacktestValidationService();
  const safetyService = new BacktestSafetyService();
  const dataService = new BacktestDataService();
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

  // Test configurations to reduce losing trades
  const testConfigs = [
    {
      name: 'Current (65/35)',
      rsiExitLong: 65,
      rsiExitShort: 35,
    },
    {
      name: 'Aggressive (60/40)',
      rsiExitLong: 60,
      rsiExitShort: 40,
    },
    {
      name: 'Very Aggressive (55/45)',
      rsiExitLong: 55,
      rsiExitShort: 45,
    },
    {
      name: 'Ultra Aggressive (52/48)',
      rsiExitLong: 52,
      rsiExitShort: 48,
    }
  ];

  for (const config of testConfigs) {
    console.log(`\n📊 Testing: ${config.name}`);
    console.log('='.repeat(50));

    const backtestConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-05'),
      initialBalance: 100000,
      strategyConfig: {
        supertrendPeriod: 10,
        supertrendMultiplier: 2,
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: config.rsiExitLong,
        rsiExitShort: config.rsiExitShort,
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
      }
    };

    try {
      const results = await backtestOrchestrator.runBacktest(backtestConfig);
      
      console.log(`📈 Results for ${config.name}:`);
      console.log(`   Total Trades: ${results.totalTrades}`);
      console.log(`   Winning Trades: ${results.winningTrades}`);
      console.log(`   Losing Trades: ${results.losingTrades}`);
      console.log(`   Win Rate: ${((results.winRate || 0) * 100).toFixed(2)}%`);
      console.log(`   Total Return: ₹${(results.totalReturn || 0).toFixed(2)} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
      console.log(`   Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
      console.log(`   Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
      console.log(`   Max Drawdown: ${((results.maxDrawdown || 0) * 100).toFixed(2)}%`);
      
      // Calculate losing trade percentage
      const losingPercentage = ((results.losingTrades || 0) / (results.totalTrades || 1)) * 100;
      console.log(`   Losing Trade %: ${losingPercentage.toFixed(1)}%`);
      
      if (losingPercentage < 70) {
        console.log(`   ✅ IMPROVEMENT: Losing trades reduced to ${losingPercentage.toFixed(1)}%`);
      } else {
        console.log(`   ❌ Still too many losing trades: ${losingPercentage.toFixed(1)}%`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${config.name}:`, error.message);
    }
  }

  console.log('\n🎯 Analysis Complete!');
}

testAggressiveExits().catch(console.error);
