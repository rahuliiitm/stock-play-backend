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

async function testHighReturnStrategy() {
  const logger = new Logger('TestHighReturnStrategy');
  
  console.log('🚀 Testing HIGH-RETURN Strategy (Target: 15-20% Annual)');
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

    // Test high-return configurations
    const configurations = [
      {
        name: "Conservative High-Return (RSI 70/30)",
        description: "Let winners run, cut losses quickly",
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
            rsiExitLong: 70, // Let winners run
            rsiExitShort: 30, // Let winners run
            atrPeriod: 14,
            atrMultiplier: 2,
            pyramidingEnabled: false,
            maxPyramidingPositions: 1,
            exitMode: 'FIFO',
            maxLots: 10,
            maxLossPct: 0.02, // 2% stop loss
            positionSize: 1,
            trailingStopEnabled: true,
            trailingStopType: 'ATR',
            trailingStopATRMultiplier: 2,
            trailingStopActivationProfit: 0.005, // 0.5% activation
            maxTrailDistance: 0.03, // 3% max trail
            atrRequiredForEntry: false,
            atrExpansionThreshold: 0,
            atrDeclineThreshold: 0,
          }
        }
      },
      {
        name: "Aggressive High-Return (RSI 80/20)",
        description: "Very conservative exits, let winners run much more",
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
            rsiExitLong: 80, // Very conservative
            rsiExitShort: 20, // Very conservative
            atrPeriod: 14,
            atrMultiplier: 2,
            pyramidingEnabled: false,
            maxPyramidingPositions: 1,
            exitMode: 'FIFO',
            maxLots: 10,
            maxLossPct: 0.02, // 2% stop loss
            positionSize: 1,
            trailingStopEnabled: true,
            trailingStopType: 'ATR',
            trailingStopATRMultiplier: 2,
            trailingStopActivationProfit: 0.01, // 1% activation
            maxTrailDistance: 0.05, // 5% max trail
            atrRequiredForEntry: false,
            atrExpansionThreshold: 0,
            atrDeclineThreshold: 0,
          }
        }
      },
      {
        name: "Trend-Following High-Return (Supertrend 14,3)",
        description: "Use longer Supertrend for better trend following",
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
            rsiEntryLong: 50,
            rsiEntryShort: 50,
            rsiExitLong: 70,
            rsiExitShort: 30,
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
        name: "Selective High-Return (RSI 40/60 Entry)",
        description: "More selective entries, better trade quality",
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
            rsiEntryLong: 40, // More selective
            rsiEntryShort: 60, // More selective
            rsiExitLong: 70,
            rsiExitShort: 30,
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

    console.log('📊 Testing 4 High-Return Strategy Configurations:');
    console.log('   1. Conservative High-Return (RSI 70/30)');
    console.log('   2. Aggressive High-Return (RSI 80/20)');
    console.log('   3. Trend-Following High-Return (Supertrend 14,3)');
    console.log('   4. Selective High-Return (RSI 40/60 Entry)');
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
    console.log('📊 HIGH-RETURN STRATEGY ANALYSIS:');
    console.log('=================================');
    
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
      // Prioritize: High annualized return, low drawdown, good win rate
      const currentScore = current.annualizedReturn + (100 - current.maxDrawdown) + current.winRate;
      const bestScore = best.annualizedReturn + (100 - best.maxDrawdown) + best.winRate;
      
      return currentScore > bestScore ? current : best;
    });

    console.log('🏆 BEST HIGH-RETURN CONFIGURATION:');
    console.log(`   ${bestConfig.name}`);
    console.log(`   Description: ${bestConfig.description}`);
    console.log(`   Annualized Return: ${bestConfig.annualizedReturn}%`);
    console.log(`   Win Rate: ${bestConfig.winRate}%`);
    console.log(`   Break-Even Rate: ${bestConfig.breakEvenRate}%`);
    console.log(`   Max Drawdown: ${bestConfig.maxDrawdown.toFixed(2)}%`);
    console.log(`   Trade Count: ${bestConfig.totalTrades}`);
    console.log('');

    console.log('💡 HIGH-RETURN ANALYSIS:');
    if (bestConfig.annualizedReturn >= 15) {
      console.log('   ✅ EXCELLENT: Annual return >= 15%');
    } else if (bestConfig.annualizedReturn >= 10) {
      console.log('   ✅ GOOD: Annual return >= 10%');
    } else if (bestConfig.annualizedReturn >= 5) {
      console.log('   ⚠️ MODERATE: Annual return >= 5%');
    } else {
      console.log('   ❌ POOR: Annual return < 5%');
    }
    
    if (bestConfig.maxDrawdown <= 10) {
      console.log('   ✅ EXCELLENT: Max drawdown <= 10%');
    } else if (bestConfig.maxDrawdown <= 20) {
      console.log('   ✅ GOOD: Max drawdown <= 20%');
    } else {
      console.log('   ❌ HIGH: Max drawdown > 20%');
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
      console.log('   ❌ TARGET NOT MET: Need optimization for 15-20% returns');
    }

    console.log('');
    console.log('🔧 OPTIMIZATION RECOMMENDATIONS:');
    if (bestConfig.annualizedReturn < 15) {
      console.log('   1. Try even more conservative RSI exits (85/15)');
      console.log('   2. Add pyramiding for trend following');
      console.log('   3. Use higher timeframe (1h) for better signals');
      console.log('   4. Add volume confirmation for entries');
      console.log('   5. Implement dynamic position sizing');
    } else {
      console.log('   1. ✅ Target achieved - optimize for consistency');
      console.log('   2. Add risk management for drawdown control');
      console.log('   3. Implement portfolio-level risk controls');
      console.log('   4. Add market regime detection');
    }

    console.log('');
    console.log('📈 NEXT STEPS:');
    console.log('   1. If target not met: Try RSI 85/15 exits');
    console.log('   2. Add pyramiding for trend following');
    console.log('   3. Use 1h timeframe for better signals');
    console.log('   4. Implement dynamic position sizing');
    console.log('   5. Add market regime detection');

  } catch (error) {
    console.error('❌ Error testing high-return strategy:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testHighReturnStrategy();


