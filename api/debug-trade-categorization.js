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

async function debugTradeCategorization() {
  const logger = new Logger('DebugTradeCategorization');
  
  console.log('🔍 Debugging Trade Categorization');
  console.log('==================================');

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

    // Short test period for debugging
    const debugConfig = {
      strategyName: 'advanced-atr',
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2015-01-01T09:15:00Z',
      endDate: '2015-01-31T15:30:00Z', // Just 1 month for debugging
      initialBalance: 100000,
      strategyConfig: {
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        supertrendPeriod: 10,
        supertrendMultiplier: 2,
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 0, // No RSI exits
        rsiExitShort: 0, // No RSI exits
        atrPeriod: 14,
        atrMultiplier: 2,
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
        maxTrailDistance: 0.05,
        atrRequiredForEntry: false,
        atrExpansionThreshold: 0,
        atrDeclineThreshold: 0,
      }
    };

    console.log('📊 Debug Configuration:');
    console.log(`   Period: 2015-01-01 to 2015-01-31 (1 month)`);
    console.log(`   Timeframe: 15 minutes`);
    console.log('');

    const results = await backtestOrchestrator.runBacktest(debugConfig);

    if (!results) {
      console.log('❌ No results returned from backtest');
      return;
    }

    console.log('📈 Debug Results:');
    console.log(`   Total Trades: ${results.totalTrades || 0}`);
    console.log(`   Winning Trades: ${results.winningTrades || 0}`);
    console.log(`   Losing Trades: ${results.losingTrades || 0}`);
    console.log(`   Win Rate: ${((results.winRate || 0) * 100).toFixed(2)}%`);
    console.log(`   Total Return: ₹${(results.totalReturn || 0).toFixed(2)} (${(results.totalReturnPercentage || 0).toFixed(2)}%)`);
    console.log(`   Average Win: ₹${(results.averageWin || 0).toFixed(2)}`);
    console.log(`   Average Loss: ₹${(results.averageLoss || 0).toFixed(2)}`);
    console.log(`   Max Win: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`   Max Loss: ₹${(results.maxLoss || 0).toFixed(2)}`);
    
    // Mathematical verification
    const totalTrades = results.totalTrades || 0;
    const winningTrades = results.winningTrades || 0;
    const losingTrades = results.losingTrades || 0;
    const unaccountedTrades = totalTrades - winningTrades - losingTrades;
    
    console.log('');
    console.log('🧮 Mathematical Verification:');
    console.log(`   Total Trades: ${totalTrades}`);
    console.log(`   Winning Trades: ${winningTrades}`);
    console.log(`   Losing Trades: ${losingTrades}`);
    console.log(`   Unaccounted Trades: ${unaccountedTrades}`);
    console.log(`   Expected Winning Trades: ${totalTrades - losingTrades}`);
    
    if (unaccountedTrades > 0) {
      console.log(`   ⚠️  ${unaccountedTrades} trades are unaccounted for!`);
      console.log(`   These could be break-even trades (P&L = 0)`);
    } else if (unaccountedTrades < 0) {
      console.log(`   ❌ Negative unaccounted trades - data error!`);
    } else {
      console.log(`   ✅ All trades properly categorized`);
    }
    
    // Analyze individual trades if available
    if (results.trades && results.trades.length > 0) {
      console.log('');
      console.log('📊 Trade Analysis:');
      
      const trades = results.trades;
      const winningTradesActual = trades.filter(t => t.pnl > 0).length;
      const losingTradesActual = trades.filter(t => t.pnl < 0).length;
      const breakEvenTrades = trades.filter(t => t.pnl === 0).length;
      
      console.log(`   Actual Winning Trades: ${winningTradesActual}`);
      console.log(`   Actual Losing Trades: ${losingTradesActual}`);
      console.log(`   Break-even Trades: ${breakEvenTrades}`);
      console.log(`   Total from analysis: ${winningTradesActual + losingTradesActual + breakEvenTrades}`);
      
      // Show some example trades
      console.log('');
      console.log('📋 Sample Trades:');
      trades.slice(0, 5).forEach((trade, index) => {
        console.log(`   Trade ${index + 1}: P&L = ₹${trade.pnl.toFixed(2)}, Direction = ${trade.direction}`);
      });
    }

  } catch (error) {
    console.error('❌ Error debugging trade categorization:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugTradeCategorization();


