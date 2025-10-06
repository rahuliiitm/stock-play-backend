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

async function testFixedStrategy15m() {
  const logger = new Logger('TestFixedStrategy15m');
  
  console.log('🚀 Testing FIXED Strategy (15m timeframe, Target: 15-20% Annual)');
  console.log('================================================================');
  console.log('🎯 FIXING: Same-candle entry/exit problem');
  console.log('🎯 FIXING: Break-even rate 80%+ problem');
  console.log('🎯 FIXING: Low win rate problem');
  console.log('');

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

    // Test FIXED configurations that address the fundamental issues
    const configurations = [
      {
        name: "Pure Supertrend Strategy (No RSI)",
        description: "Use only Supertrend for entries/exits, no RSI interference",
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
            rsiEntryLong: 0, // DISABLE RSI entries
            rsiEntryShort: 0, // DISABLE RSI entries
            rsiExitLong: 0, // DISABLE RSI exits
            rsiExitShort: 0, // DISABLE RSI exits
            atrPeriod: 14,
            atrMultiplier: 2,
            pyramidingEnabled: false,
            maxPyramidingPositions: 1,
            exitMode: 'FIFO',
            maxLots: 10,
            maxLossPct: 0.02,
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
        name: "Conservative Supertrend (14,3)",
        description: "Use longer Supertrend period for better trend following",
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
            supertrendPeriod: 14, // Longer period
            supertrendMultiplier: 3, // Higher multiplier
            rsiPeriod: 14,
            rsiEntryLong: 0, // DISABLE RSI
            rsiEntryShort: 0, // DISABLE RSI
            rsiExitLong: 0, // DISABLE RSI
            rsiExitShort: 0, // DISABLE RSI
            atrPeriod: 14,
            atrMultiplier: 2,
            pyramidingEnabled: false,
            maxPyramidingPositions: 1,
            exitMode: 'FIFO',
            maxLots: 10,
            maxLossPct: 0.02,
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
        name: "EMA Crossover Strategy (No RSI)",
        description: "Use EMA crossover with no RSI interference",
        config: {
          strategyName: 'ema-gap-atr',
          symbol: 'NIFTY',
          timeframe: '15m',
          startDate: '2020-01-01T09:15:00Z',
          endDate: '2020-12-31T15:30:00Z',
          initialBalance: 100000,
          strategyConfig: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            rsiPeriod: 14,
            rsiEntryLong: 0, // DISABLE RSI
            rsiEntryShort: 0, // DISABLE RSI
            rsiExitLong: 0, // DISABLE RSI
            rsiExitShort: 0, // DISABLE RSI
            atrPeriod: 14,
            atrMultiplier: 2,
            pyramidingEnabled: false,
            maxPyramidingPositions: 1,
            exitMode: 'FIFO',
            maxLots: 10,
            maxLossPct: 0.02,
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
        name: "Very Conservative Supertrend (20,4)",
        description: "Use very conservative Supertrend parameters",
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
            supertrendPeriod: 20, // Very long period
            supertrendMultiplier: 4, // Very high multiplier
            rsiPeriod: 14,
            rsiEntryLong: 0, // DISABLE RSI
            rsiEntryShort: 0, // DISABLE RSI
            rsiExitLong: 0, // DISABLE RSI
            rsiExitShort: 0, // DISABLE RSI
            atrPeriod: 14,
            atrMultiplier: 2,
            pyramidingEnabled: false,
            maxPyramidingPositions: 1,
            exitMode: 'FIFO',
            maxLots: 10,
            maxLossPct: 0.02,
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

    console.log('📊 Testing 4 FIXED Strategy Configurations:');
    console.log('   1. Pure Supertrend Strategy (No RSI)');
    console.log('   2. Conservative Supertrend (14,3)');
    console.log('   3. EMA Crossover Strategy (No RSI)');
    console.log('   4. Very Conservative Supertrend (20,4)');
    console.log('');

    const results = [];

    for (let i = 0; i < configurations.length; i++) {
      const { name, description, config } = configurations[i];
      
      console.log(`🧪 Testing ${i + 1}/4: ${name}`);
      console.log(`   ${description}`);
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
      const annualizedReturn = (Math.pow(1 + (result.totalReturnPercentage || 0) / 100, 1) - 1) * 100;
      
      console.log(`   📈 Results:`);
      console.log(`      Total Trades: ${totalTrades}`);
      console.log(`      Win Rate: ${winRate}%`);
      console.log(`      Break-Even Rate: ${breakEvenRate}%`);
      console.log(`      Total Return: ${totalReturn}%`);
      console.log(`      Annualized Return: ${annualizedReturn.toFixed(2)}%`);
      console.log(`      Avg Win: ₹${(result.averageWin || 0).toFixed(2)}`);
      console.log(`      Avg Loss: ₹${(result.averageLoss || 0).toFixed(2)}`);
      console.log(`      Max Drawdown: ${((result.maxDrawdown || 0) * 100).toFixed(2)}%`);
      
      results.push({
        name,
        description,
        totalTrades,
        winRate: parseFloat(winRate),
        breakEvenRate: parseFloat(breakEvenRate),
        totalReturn: parseFloat(totalReturn),
        annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
        avgWin: result.averageWin || 0,
        avgLoss: result.averageLoss || 0,
        maxDrawdown: (result.maxDrawdown || 0) * 100
      });
      
      console.log('');
    }

    // Analysis and recommendations
    console.log('📊 FIXED STRATEGY ANALYSIS:');
    console.log('============================');
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}:`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Annualized Return: ${result.annualizedReturn}%`);
      console.log(`   Win Rate: ${result.winRate}%`);
      console.log(`   Break-Even Rate: ${result.breakEvenRate}%`);
      console.log(`   Max Drawdown: ${result.maxDrawdown.toFixed(2)}%`);
      console.log(`   Trade Count: ${result.totalTrades}`);
      console.log('');
    });

    // Find best configuration for high returns
    const bestConfig = results.reduce((best, current) => {
      // Prioritize: High annualized return, low drawdown, good win rate, low break-even rate
      const currentScore = current.annualizedReturn + (100 - current.maxDrawdown) + current.winRate + (100 - current.breakEvenRate);
      const bestScore = best.annualizedReturn + (100 - best.maxDrawdown) + best.winRate + (100 - best.breakEvenRate);
      
      return currentScore > bestScore ? current : best;
    });

    console.log('🏆 BEST FIXED CONFIGURATION:');
    console.log(`   ${bestConfig.name}`);
    console.log(`   Description: ${bestConfig.description}`);
    console.log(`   Annualized Return: ${bestConfig.annualizedReturn}%`);
    console.log(`   Win Rate: ${bestConfig.winRate}%`);
    console.log(`   Break-Even Rate: ${bestConfig.breakEvenRate}%`);
    console.log(`   Max Drawdown: ${bestConfig.maxDrawdown.toFixed(2)}%`);
    console.log(`   Trade Count: ${bestConfig.totalTrades}`);
    console.log('');

    console.log('💡 FIXED STRATEGY ANALYSIS:');
    if (bestConfig.annualizedReturn >= 15) {
      console.log('   ✅ EXCELLENT: Annual return >= 15%');
    } else if (bestConfig.annualizedReturn >= 10) {
      console.log('   ✅ GOOD: Annual return >= 10%');
    } else if (bestConfig.annualizedReturn >= 5) {
      console.log('   ⚠️ MODERATE: Annual return >= 5%');
    } else {
      console.log('   ❌ POOR: Annual return < 5%');
    }
    
    if (bestConfig.breakEvenRate <= 20) {
      console.log('   ✅ EXCELLENT: Break-even rate <= 20%');
    } else if (bestConfig.breakEvenRate <= 40) {
      console.log('   ✅ GOOD: Break-even rate <= 40%');
    } else {
      console.log('   ❌ HIGH: Break-even rate > 40%');
    }
    
    if (bestConfig.winRate >= 50) {
      console.log('   ✅ EXCELLENT: Win rate >= 50%');
    } else if (bestConfig.winRate >= 40) {
      console.log('   ✅ GOOD: Win rate >= 40%');
    } else {
      console.log('   ❌ LOW: Win rate < 40%');
    }

    console.log('');
    console.log('🎯 TARGET ACHIEVEMENT:');
    if (bestConfig.annualizedReturn >= 15) {
      console.log('   ✅ TARGET ACHIEVED: 15-20% annual returns');
    } else {
      console.log('   ❌ TARGET NOT MET: Need further optimization for 15-20% returns');
    }

    console.log('');
    console.log('🔧 FURTHER OPTIMIZATION RECOMMENDATIONS:');
    if (bestConfig.annualizedReturn < 15) {
      console.log('   1. Try even longer Supertrend periods (30, 50)');
      console.log('   2. Add pyramiding for trend following');
      console.log('   3. Use multiple timeframe analysis');
      console.log('   4. Add volume confirmation for entries');
      console.log('   5. Implement dynamic position sizing');
      console.log('   6. Add market regime detection');
    } else {
      console.log('   1. ✅ Target achieved - optimize for consistency');
      console.log('   2. Add risk management for drawdown control');
      console.log('   3. Implement portfolio-level risk controls');
      console.log('   4. Add market regime detection');
    }

    console.log('');
    console.log('📈 NEXT STEPS:');
    console.log('   1. If target not met: Try longer Supertrend periods');
    console.log('   2. Add pyramiding for trend following');
    console.log('   3. Use multiple timeframe analysis');
    console.log('   4. Implement dynamic position sizing');
    console.log('   5. Add market regime detection');

  } catch (error) {
    console.error('❌ Error testing fixed strategy:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFixedStrategy15m();


