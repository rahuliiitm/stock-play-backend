#!/usr/bin/env node

/**
 * Test Backtest with Dependencies
 * 
 * This script properly initializes the backtest orchestrator with all dependencies
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATA_PROVIDER_MODE = 'csv';
process.env.CSV_DATA_DIR = path.join(__dirname, 'data');

console.log('🧪 TEST BACKTEST WITH DEPENDENCIES');
console.log('==================================\n');

async function testBacktestWithDependencies() {
  try {
    // Import all required services
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
    
    console.log('✅ All services imported successfully');
    
    // Initialize all dependencies
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
    
    console.log('✅ All dependencies initialized');
    
    // Create backtest orchestrator with all dependencies
    const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
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
    
    console.log('✅ Backtest orchestrator initialized with all dependencies');
    
    // Test backtest configuration
    const backtestConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-05'),
      initialBalance: 100000,
      strategyConfig: {
        // Supertrend parameters
        supertrendPeriod: 10,
        supertrendMultiplier: 2.0,
        
        // RSI parameters
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 65,
        rsiExitShort: 35,
        
        // ATR parameters
        atrPeriod: 14,
        
        // Strategy settings
        pyramidingEnabled: false,
        maxPyramidingPositions: 1,
        exitMode: 'FIFO',
        
        // Risk management
        maxLots: 10,
        maxLossPct: 0.05,
        positionSize: 1,
        
        // Trailing stop
        trailingStopEnabled: true,
        trailingStopType: 'ATR',
        trailingStopATRMultiplier: 2.0,
        trailingStopActivationProfit: 0.01,
        
        // ATR thresholds - set to 0 to disable ATR logic
        atrRequiredForEntry: false,
        atrExpansionThreshold: 0,
        atrDeclineThreshold: 0,
      },
      commission: 0.001,
      slippage: 0.0005
    };
    
    console.log('📋 Backtest Configuration:');
    console.log(`  Symbol: ${backtestConfig.symbol}`);
    console.log(`  Timeframe: ${backtestConfig.timeframe}`);
    console.log(`  Period: ${backtestConfig.startDate.toISOString().split('T')[0]} to ${backtestConfig.endDate.toISOString().split('T')[0]}`);
    console.log(`  Initial Balance: ₹${backtestConfig.initialBalance.toLocaleString()}`);
    console.log(`  Supertrend: Period=${backtestConfig.strategyConfig.supertrendPeriod}, Multiplier=${backtestConfig.strategyConfig.supertrendMultiplier}`);
    console.log(`  RSI: Entry=${backtestConfig.strategyConfig.rsiEntryLong}/${backtestConfig.strategyConfig.rsiEntryShort}, Exit=${backtestConfig.strategyConfig.rsiExitLong}/${backtestConfig.strategyConfig.rsiExitShort}`);
    console.log(`  ATR Thresholds: Expansion=${backtestConfig.strategyConfig.atrExpansionThreshold}, Decline=${backtestConfig.strategyConfig.atrDeclineThreshold}`);
    console.log('');
    
    // Run the backtest
    console.log('🔄 Running backtest with proper dependencies...');
    const startTime = Date.now();
    
    const results = await backtestOrchestrator.runBacktest(backtestConfig);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log('✅ Backtest completed successfully!');
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    console.log('');
    
    // Display results
    console.log('📊 BACKTEST RESULTS:');
    console.log('===================');
    
    if (!results) {
      console.log('❌ No results returned from backtest');
      return;
    }
    
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
    console.log(`Max Drawdown: ₹${(results.maxDrawdown || 0).toLocaleString()} (${(results.maxDrawdownPercentage || 0).toFixed(2)}%)`);
    console.log(`Sharpe Ratio: ${(results.sharpeRatio || 0).toFixed(2)}`);
    console.log(`Max Win: ₹${(results.maxWin || 0).toFixed(2)}`);
    console.log(`Max Loss: ₹${(results.maxLoss || 0).toFixed(2)}`);
    console.log('');
    
    // Show some trades if available
    if (results.trades && results.trades.length > 0) {
      console.log('📈 SAMPLE TRADES:');
      console.log('================');
      results.trades.slice(0, 5).forEach((trade, index) => {
        console.log(`Trade ${index + 1}: ${trade.direction} ${trade.quantity} @ ₹${trade.entryPrice.toFixed(2)} -> ₹${trade.exitPrice?.toFixed(2) || 'Open'} (${trade.pnl?.toFixed(2) || '0'}%)`);
      });
      if (results.trades.length > 5) {
        console.log(`... and ${results.trades.length - 5} more trades`);
      }
      console.log('');
    }
    
    console.log('🎯 Backtest with Dependencies Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testBacktestWithDependencies();


