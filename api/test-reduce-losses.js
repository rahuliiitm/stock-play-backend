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

async function testReduceLosses() {
  console.log('🚀 Testing Strategies to Reduce 331 Losing Trades...\n');

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

  // Test different RSI exit strategies
  const strategies = [
    {
      name: 'Current (65/35) - 331 losses',
      rsiExitLong: 65,
      rsiExitShort: 35,
      description: 'Current problematic config'
    },
    {
      name: 'Aggressive (60/40)',
      rsiExitLong: 60,
      rsiExitShort: 40,
      description: 'More frequent exits'
    },
    {
      name: 'Very Aggressive (55/45)',
      rsiExitLong: 55,
      rsiExitShort: 45,
      description: 'Much more frequent exits'
    },
    {
      name: 'Ultra Aggressive (52/48)',
      rsiExitLong: 52,
      rsiExitShort: 48,
      description: 'Exit almost immediately'
    },
    {
      name: 'No Short Trades (Long Only)',
      rsiExitLong: 60,
      rsiExitShort: 35,
      disableShort: true,
      description: 'Only long trades (NIFTY uptrend)'
    }
  ];

  for (const strategy of strategies) {
    console.log(`\n📊 Testing: ${strategy.name}`);
    console.log(`   ${strategy.description}`);
    console.log('='.repeat(60));

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
        rsiEntryShort: strategy.disableShort ? 0 : 50, // Disable short if specified
        rsiExitLong: strategy.rsiExitLong,
        rsiExitShort: strategy.rsiExitShort,
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
      
      const losingPercentage = ((results.losingTrades || 0) / (results.totalTrades || 1)) * 100;
      const winRate = (results.winRate || 0) * 100;
      
      console.log(`📈 Results:`);
      console.log(`   Total Trades: ${results.totalTrades}`);
      console.log(`   Winning Trades: ${results.winningTrades}`);
      console.log(`   Losing Trades: ${results.losingTrades}`);
      console.log(`   Win Rate: ${winRate.toFixed(2)}%`);
      console.log(`   Losing Trade %: ${losingPercentage.toFixed(1)}%`);
      console.log(`   Total Return: ₹${(results.totalReturn || 0).toFixed(2)} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
      console.log(`   Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
      console.log(`   Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
      console.log(`   Max Drawdown: ${((results.maxDrawdown || 0) * 100).toFixed(2)}%`);
      
      // Analysis
      if (losingPercentage < 50) {
        console.log(`   ✅ EXCELLENT: Losing trades reduced to ${losingPercentage.toFixed(1)}%`);
      } else if (losingPercentage < 70) {
        console.log(`   ✅ GOOD: Losing trades reduced to ${losingPercentage.toFixed(1)}%`);
      } else if (losingPercentage < 80) {
        console.log(`   ⚠️  MODERATE: Still ${losingPercentage.toFixed(1)}% losing trades`);
      } else {
        console.log(`   ❌ POOR: Still ${losingPercentage.toFixed(1)}% losing trades`);
      }
      
      if (winRate > 50) {
        console.log(`   ✅ Good win rate: ${winRate.toFixed(2)}%`);
      } else if (winRate > 30) {
        console.log(`   ⚠️  Moderate win rate: ${winRate.toFixed(2)}%`);
      } else {
        console.log(`   ❌ Poor win rate: ${winRate.toFixed(2)}%`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${strategy.name}:`, error.message);
    }
  }

  console.log('\n🎯 Analysis Complete!');
  console.log('\n💡 Recommendations:');
  console.log('   1. Try more aggressive RSI exits (55/45 or 52/48)');
  console.log('   2. Consider long-only strategy (NIFTY uptrend)');
  console.log('   3. Add stop-loss protection');
  console.log('   4. Optimize entry conditions');
}

testReduceLosses().catch(console.error);
