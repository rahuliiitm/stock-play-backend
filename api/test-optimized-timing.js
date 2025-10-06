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

async function testOptimizedTiming() {
  const logger = new Logger('TestOptimizedTiming');
  
  console.log('🚀 Testing OPTIMIZED TIMING Strategy - Break-Even Reduction');
  console.log('==========================================================');

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

    // Test different configurations to reduce break-even trades
    const configurations = [
      {
        name: "Conservative RSI Exits (70/30)",
        config: {
          strategyName: 'advanced-atr',
          symbol: 'NIFTY',
          timeframe: '15m',
          startDate: '2020-01-01T09:15:00Z',
          endDate: '2020-12-31T15:30:00Z', // 1 year test
          initialBalance: 100000,
          strategyConfig: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            supertrendPeriod: 10,
            supertrendMultiplier: 2,
            rsiPeriod: 14,
            rsiEntryLong: 50,
            rsiEntryShort: 50,
            rsiExitLong: 70, // More conservative - let winners run
            rsiExitShort: 30, // More conservative - let winners run
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
        }
      },
      {
        name: "Very Conservative RSI Exits (75/25)",
        config: {
          strategyName: 'advanced-atr',
          symbol: 'NIFTY',
          timeframe: '15m',
          startDate: '2020-01-01T09:15:00Z',
          endDate: '2020-12-31T15:30:00Z',
          initialBalance: 100000,
          strategyConfig: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            supertrendPeriod: 10,
            supertrendMultiplier: 2,
            rsiPeriod: 14,
            rsiEntryLong: 50,
            rsiEntryShort: 50,
            rsiExitLong: 75, // Very conservative
            rsiExitShort: 25, // Very conservative
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
        }
      },
      {
        name: "Balanced RSI Exits (60/40)",
        config: {
          strategyName: 'advanced-atr',
          symbol: 'NIFTY',
          timeframe: '15m',
          startDate: '2020-01-01T09:15:00Z',
          endDate: '2020-12-31T15:30:00Z',
          initialBalance: 100000,
          strategyConfig: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            supertrendPeriod: 10,
            supertrendMultiplier: 2,
            rsiPeriod: 14,
            rsiEntryLong: 50,
            rsiEntryShort: 50,
            rsiExitLong: 60, // Balanced
            rsiExitShort: 40, // Balanced
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
        }
      }
    ];

    console.log('📊 Testing 3 Different RSI Exit Configurations:');
    console.log('   1. Conservative (70/30) - Let winners run more');
    console.log('   2. Very Conservative (75/25) - Let winners run even more');
    console.log('   3. Balanced (60/40) - Quick profit taking');
    console.log('');

    const results = [];

    for (let i = 0; i < configurations.length; i++) {
      const { name, config } = configurations[i];
      
      console.log(`🧪 Testing ${i + 1}/3: ${name}`);
      console.log(`   RSI Exits: ${config.strategyConfig.rsiExitLong}/${config.strategyConfig.rsiExitShort}`);
      console.log(`   Period: 2020 (1 year)`);
      
      const result = await backtestOrchestrator.runBacktest(config);
      
      if (!result) {
        console.log(`   ❌ No results for ${name}`);
        continue;
      }

      const totalTrades = result.totalTrades || 0;
      const winningTrades = result.winningTrades || 0;
      const losingTrades = result.losingTrades || 0;
      const breakEvenTrades = totalTrades - winningTrades - losingTrades;
      const breakEvenRate = (breakEvenTrades / totalTrades * 100).toFixed(1);
      const winRate = ((result.winRate || 0) * 100).toFixed(2);
      const totalReturn = (result.totalReturnPercentage || 0).toFixed(2);
      
      console.log(`   📈 Results:`);
      console.log(`      Total Trades: ${totalTrades}`);
      console.log(`      Win Rate: ${winRate}%`);
      console.log(`      Break-Even Rate: ${breakEvenRate}%`);
      console.log(`      Total Return: ${totalReturn}%`);
      console.log(`      Avg Win: ₹${(result.averageWin || 0).toFixed(2)}`);
      console.log(`      Avg Loss: ₹${(result.averageLoss || 0).toFixed(2)}`);
      
      results.push({
        name,
        totalTrades,
        winRate: parseFloat(winRate),
        breakEvenRate: parseFloat(breakEvenRate),
        totalReturn: parseFloat(totalReturn),
        avgWin: result.averageWin || 0,
        avgLoss: result.averageLoss || 0
      });
      
      console.log('');
    }

    // Analysis and recommendations
    console.log('📊 COMPARISON ANALYSIS:');
    console.log('=======================');
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}:`);
      console.log(`   Break-Even Rate: ${result.breakEvenRate}%`);
      console.log(`   Win Rate: ${result.winRate}%`);
      console.log(`   Total Return: ${result.totalReturn}%`);
      console.log(`   Trade Count: ${result.totalTrades}`);
      console.log('');
    });

    // Find best configuration
    const bestConfig = results.reduce((best, current) => {
      // Prioritize: Low break-even rate, high win rate, positive return
      const currentScore = (100 - current.breakEvenRate) + current.winRate + (current.totalReturn > 0 ? 10 : 0);
      const bestScore = (100 - best.breakEvenRate) + best.winRate + (best.totalReturn > 0 ? 10 : 0);
      
      return currentScore > bestScore ? current : best;
    });

    console.log('🏆 BEST CONFIGURATION:');
    console.log(`   ${bestConfig.name}`);
    console.log(`   Break-Even Rate: ${bestConfig.breakEvenRate}%`);
    console.log(`   Win Rate: ${bestConfig.winRate}%`);
    console.log(`   Total Return: ${bestConfig.totalReturn}%`);
    console.log('');

    console.log('💡 RECOMMENDATIONS:');
    if (bestConfig.breakEvenRate < 50) {
      console.log('   ✅ Good: Break-even rate under 50%');
    } else {
      console.log('   ❌ High: Break-even rate over 50% - needs more optimization');
    }
    
    if (bestConfig.winRate > 30) {
      console.log('   ✅ Good: Win rate over 30%');
    } else {
      console.log('   ❌ Low: Win rate under 30% - needs better entry/exit logic');
    }
    
    if (bestConfig.totalReturn > 0) {
      console.log('   ✅ Good: Positive returns');
    } else {
      console.log('   ❌ Poor: Negative returns');
    }

    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. If break-even rate is still high, try:');
    console.log('      - RSI 80/20 exits (very conservative)');
    console.log('      - Add minimum profit thresholds');
    console.log('      - Add trend confirmation (ADX > 25)');
    console.log('   2. If win rate is low, try:');
    console.log('      - Better entry conditions');
    console.log('      - Add volume confirmation');
    console.log('      - Optimize Supertrend parameters');

  } catch (error) {
    console.error('❌ Error testing optimized timing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testOptimizedTiming();


