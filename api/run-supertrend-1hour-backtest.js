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

async function runSupertrend1HourBacktest() {
  console.log('🚀 Starting Supertrend + RSI Strategy Backtest (1-Hour Timeframe)');
  console.log('='.repeat(60));

  try {
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

    // Initialize orchestrator with all dependencies
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

    // Strategy configuration for 1-hour timeframe
    const strategyConfig = {
      // Supertrend parameters
      supertrendPeriod: 10,
      supertrendMultiplier: 2,
      
      // RSI parameters
      rsiPeriod: 14,
      rsiEntryLong: 50,    // Entry when RSI > 50
      rsiEntryShort: 50,   // Entry when RSI < 50
      rsiExitLong: 65,     // Exit long when RSI > 65
      rsiExitShort: 35,    // Exit short when RSI < 35
      
      // ATR parameters (disabled for entry, used for trailing stop)
      atrPeriod: 14,
      atrRequiredForEntry: false, // Disable ATR requirement for entry
      
      // Pyramiding disabled
      pyramidingEnabled: false,
      maxPyramidingPositions: 1,
      
      // Exit strategy
      exitMode: 'FIFO',
      
      // Risk management
      maxLots: 10,
      maxLossPct: 0.05,
      positionSize: 1,
      
      // Trailing stop configuration
      trailingStopEnabled: true,
      trailingStopType: 'ATR',
      trailingStopATRMultiplier: 2,
      trailingStopActivationProfit: 0.01, // 1% profit before trailing starts
      maxTrailDistance: 0.05, // 5% maximum trail distance
      
      // Disable ATR expansion/decline thresholds
      atrExpansionThreshold: 0,
      atrDeclineThreshold: 0,
    };

    // Backtest configuration
    const backtestConfig = {
      symbol: 'NIFTY',
      timeframe: '1h', // 1-hour timeframe for fewer trades
      startDate: '2020-01-01', // Use 2020 data that exists
      endDate: '2020-01-31', // One month for testing
      initialBalance: 100000,
      commission: 0.001,
      slippage: 0.0005,
      strategyConfig: strategyConfig,
    };

    console.log('📋 Strategy Configuration:');
    console.log(`   Timeframe: ${backtestConfig.timeframe}`);
    console.log(`   Supertrend: (${strategyConfig.supertrendPeriod}, ${strategyConfig.supertrendMultiplier})`);
    console.log(`   RSI Entry: ${strategyConfig.rsiEntryLong}/${strategyConfig.rsiEntryShort}`);
    console.log(`   RSI Exit: ${strategyConfig.rsiExitLong}/${strategyConfig.rsiExitShort}`);
    console.log(`   Pyramiding: ${strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   Exit Mode: ${strategyConfig.exitMode}`);
    console.log(`   Trailing Stop: ${strategyConfig.trailingStopEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Run backtest
    const startTime = Date.now();
    const results = await backtestOrchestrator.runBacktest(backtestConfig);
    const endTime = Date.now();

    if (!results) {
      console.log('❌ Backtest failed - no results returned');
      return;
    }

    console.log('✅ Backtest completed successfully!');
    console.log(`⏱️  Execution time: ${endTime - startTime}ms`);
    console.log('');

    // Display results
    console.log('📊 BACKTEST RESULTS:');
    console.log('===================');
    console.log(`Initial Capital: ₹${(results.initialCapital || 0).toLocaleString()}`);
    console.log(`Final Capital: ₹${(results.finalCapital || 0).toLocaleString()}`);
    console.log(`Total Return: ₹${(results.totalReturn || 0).toLocaleString()} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
    console.log(`Total Trades: ${results.totalTrades || 0}`);
    console.log(`Winning Trades: ${results.winningTrades || 0}`);
    console.log(`Losing Trades: ${results.losingTrades || 0}`);
    console.log(`Win Rate: ${(results.winRate || 0).toFixed(2)}%`);
    console.log(`Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
    console.log(`Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
    console.log(`Profit Factor: ${(results.profitFactor || 0).toFixed(2)}`);
    console.log(`Max Drawdown: ₹${(results.maxDrawdown || 0).toFixed(3)} (${(results.maxDrawdownPercentage || 0).toFixed(2)}%)`);
    console.log(`Sharpe Ratio: ${(results.sharpeRatio || 0).toFixed(2)}`);
    console.log(`Max Win: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`Max Loss: ₹${(results.maxLoss || 0).toFixed(2)}`);
    console.log('');

    console.log('📈 STRATEGY ANALYSIS:');
    console.log('====================');
    console.log('Strategy: Supertrend(10, 2) + RSI(14)');
    console.log(`Timeframe: ${backtestConfig.timeframe}`);
    console.log(`Pyramiding: ${strategyConfig.pyramidingEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Exit Mode: ${strategyConfig.exitMode}`);
    console.log(`Trailing Stop: ${strategyConfig.trailingStopEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('');

    console.log('🎯 PERFORMANCE METRICS:');
    console.log('======================');
    console.log(`Annualized Return: ${(results.annualizedReturn || 0).toFixed(2)}%`);
    console.log(`Return per Trade: ${(results.returnPerTrade || 0).toFixed(2)}%`);
    console.log(`Risk-Adjusted Return: ${(results.riskAdjustedReturn || 0).toFixed(2)}`);
    console.log('');

    console.log('📊 TRADE ANALYSIS:');
    console.log('=================');
    console.log(`Average Trade Duration: ${(results.averageTradeDuration || 0).toFixed(2)} hours`);
    console.log(`Best Trade: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`Worst Trade: ₹${(results.maxLoss || 0).toFixed(2)}`);
    console.log(`Win/Loss Ratio: ${(results.winLossRatio || 0).toFixed(2)}`);
    console.log('');

    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    if ((results.winRate || 0) < 30) {
      console.log('⚠️  Low win rate - consider adjusting RSI thresholds');
    }
    if ((results.totalTrades || 0) > 100) {
      console.log('📈 High trade frequency - consider longer timeframe or stricter entry conditions');
    }
    if ((results.maxDrawdownPercentage || 0) > 10) {
      console.log('⚠️  High drawdown - consider tighter risk management');
    }
    console.log('');

    console.log('🎯 Supertrend + RSI Strategy Backtest Complete!');

  } catch (error) {
    console.error('❌ Backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the backtest
runSupertrend1HourBacktest();
