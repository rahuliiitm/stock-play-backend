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

async function testAdvancedBreakEvenReduction() {
  const logger = new Logger('TestAdvancedBreakEvenReduction');
  
  console.log('🚀 Testing ADVANCED Break-Even Reduction Strategies');
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

    // Test advanced configurations to further reduce break-even trades
    const configurations = [
      {
        name: "RSI 60/40 + ADX Trend Confirmation",
        description: "Add ADX > 25 for trend confirmation",
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
            rsiExitLong: 60,
            rsiExitShort: 40,
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
            // Add ADX trend confirmation
            adxPeriod: 14,
            adxThreshold: 25, // Only trade when ADX > 25 (strong trend)
          }
        }
      },
      {
        name: "RSI 60/40 + Minimum Profit Threshold",
        description: "Add minimum 0.5% profit before allowing exits",
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
            rsiExitLong: 60,
            rsiExitShort: 40,
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
            trailingStopActivationProfit: 0.005, // 0.5% minimum profit
            maxTrailDistance: 0.05,
            atrRequiredForEntry: false,
            atrExpansionThreshold: 0,
            atrDeclineThreshold: 0,
          }
        }
      },
      {
        name: "RSI 60/40 + Better Entry Timing",
        description: "Use RSI 40/60 for entries (more selective)",
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
            rsiEntryLong: 40, // More selective entry
            rsiEntryShort: 60, // More selective entry
            rsiExitLong: 60,
            rsiExitShort: 40,
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
        name: "RSI 60/40 + Supertrend Optimization",
        description: "Use Supertrend(14, 3) for better signals",
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
            rsiExitLong: 60,
            rsiExitShort: 40,
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

    console.log('📊 Testing 4 Advanced Break-Even Reduction Strategies:');
    console.log('   1. RSI 60/40 + ADX Trend Confirmation');
    console.log('   2. RSI 60/40 + Minimum Profit Threshold');
    console.log('   3. RSI 60/40 + Better Entry Timing (40/60)');
    console.log('   4. RSI 60/40 + Supertrend Optimization (14,3)');
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
      
      console.log(`   📈 Results:`);
      console.log(`      Total Trades: ${totalTrades}`);
      console.log(`      Win Rate: ${winRate}%`);
      console.log(`      Break-Even Rate: ${breakEvenRate}%`);
      console.log(`      Total Return: ${totalReturn}%`);
      console.log(`      Avg Win: ₹${(result.averageWin || 0).toFixed(2)}`);
      console.log(`      Avg Loss: ₹${(result.averageLoss || 0).toFixed(2)}`);
      
      results.push({
        name,
        description,
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
    console.log('📊 ADVANCED BREAK-EVEN REDUCTION ANALYSIS:');
    console.log('==========================================');
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}:`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Break-Even Rate: ${result.breakEvenRate}%`);
      console.log(`   Win Rate: ${result.winRate}%`);
      console.log(`   Total Return: ${result.totalReturn}%`);
      console.log(`   Trade Count: ${result.totalTrades}`);
      console.log('');
    });

    // Find best configuration
    const bestConfig = results.reduce((best, current) => {
      // Prioritize: Low break-even rate, high win rate, positive return, reasonable trade count
      const currentScore = (100 - current.breakEvenRate) + current.winRate + 
                          (current.totalReturn > 0 ? 20 : 0) + 
                          (current.totalTrades > 50 && current.totalTrades < 1000 ? 10 : 0);
      const bestScore = (100 - best.breakEvenRate) + best.winRate + 
                       (best.totalReturn > 0 ? 20 : 0) + 
                       (best.totalTrades > 50 && best.totalTrades < 1000 ? 10 : 0);
      
      return currentScore > bestScore ? current : best;
    });

    console.log('🏆 BEST ADVANCED CONFIGURATION:');
    console.log(`   ${bestConfig.name}`);
    console.log(`   Description: ${bestConfig.description}`);
    console.log(`   Break-Even Rate: ${bestConfig.breakEvenRate}%`);
    console.log(`   Win Rate: ${bestConfig.winRate}%`);
    console.log(`   Total Return: ${bestConfig.totalReturn}%`);
    console.log(`   Trade Count: ${bestConfig.totalTrades}`);
    console.log('');

    console.log('💡 BREAK-EVEN REDUCTION ANALYSIS:');
    if (bestConfig.breakEvenRate < 30) {
      console.log('   ✅ EXCELLENT: Break-even rate under 30%');
    } else if (bestConfig.breakEvenRate < 50) {
      console.log('   ✅ GOOD: Break-even rate under 50%');
    } else {
      console.log('   ❌ HIGH: Break-even rate over 50% - needs more optimization');
    }
    
    if (bestConfig.winRate > 40) {
      console.log('   ✅ EXCELLENT: Win rate over 40%');
    } else if (bestConfig.winRate > 30) {
      console.log('   ✅ GOOD: Win rate over 30%');
    } else {
      console.log('   ❌ LOW: Win rate under 30% - needs better entry/exit logic');
    }
    
    if (bestConfig.totalReturn > 10) {
      console.log('   ✅ EXCELLENT: Returns over 10%');
    } else if (bestConfig.totalReturn > 0) {
      console.log('   ✅ GOOD: Positive returns');
    } else {
      console.log('   ❌ POOR: Negative returns');
    }

    console.log('');
    console.log('🔧 FINAL RECOMMENDATIONS:');
    console.log('   1. ✅ Use the best configuration above');
    console.log('   2. If break-even rate is still high:');
    console.log('      - Try RSI 80/20 exits (very conservative)');
    console.log('      - Add volume confirmation');
    console.log('      - Use higher timeframe (1h instead of 15m)');
    console.log('   3. If win rate is low:');
    console.log('      - Optimize Supertrend parameters further');
    console.log('      - Add multiple timeframe analysis');
    console.log('      - Use machine learning for parameter optimization');
    console.log('   4. If returns are negative:');
    console.log('      - Add stop-loss protection');
    console.log('      - Use position sizing based on volatility');
    console.log('      - Consider market regime detection');

    console.log('');
    console.log('🎯 BREAK-EVEN REDUCTION SUCCESS METRICS:');
    console.log(`   Target Break-Even Rate: < 30%`);
    console.log(`   Target Win Rate: > 40%`);
    console.log(`   Target Returns: > 10%`);
    console.log(`   Target Trade Count: 100-500 per year`);

  } catch (error) {
    console.error('❌ Error testing advanced break-even reduction:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAdvancedBreakEvenReduction();


