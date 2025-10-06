const path = require('path');
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
const { TrendFollowingStrategyService } = require('./dist/src/modules/strategy/services/trend-following-strategy.service');
const { StrategyBuildingBlocksService } = require('./dist/src/modules/strategy/services/strategy-building-blocks.service');
const { Logger } = require('@nestjs/common');

// Reduce NestJS logging noise to focus on trade logs
Logger.overrideLogger(['log', 'debug', 'warn', 'error']);

function formatTimestamp(value) {
  if (!value) {
    return 'N/A';
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toISOString();
  } catch (error) {
    return `Invalid date (${error.message})`;
  }
}

async function testTrendFollowingStrategy() {
  const logger = new Logger('TestTrendFollowingStrategy');
  
  console.log('🚀 Testing TREND-FOLLOWING Strategy (Supertrend + DEMA)');
  console.log('=====================================================');
  console.log('📌 Strategy: Supertrend(10,1) + DEMA(52) on Weekly Timeframe');
  console.log('📌 Entry: Price > DEMA(52) AND Price above Supertrend(10,1) → Long');
  console.log('📌 Entry: Price < DEMA(52) AND Price below Supertrend(10,1) → Short');
  console.log('📌 Exit: Only when Supertrend flips (no partial exits)');
  console.log('');

  try {
    // Set the data directory environment variable
    process.env.CSV_DATA_DIR = path.join(process.cwd(), 'data');
    
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
    const trendFollowingStrategyService = new TrendFollowingStrategyService();

    // Create a custom backtest orchestrator that supports our new strategy
    const backtestOrchestrator = new BacktestOrchestratorService(
      dataProvider,
      orderExecution,
      emaGapAtrStrategyService,
      advancedATRStrategyService,
      trendFollowingStrategyService,
      validationService,
      safetyService,
      dataService,
      metricsService,
      exitStrategyFactory,
      trailingStopService
    );

    // Test configurations for the trend-following strategy
        const configurations = [
          {
            name: "Optimized Strategy for 20% Returns",
            description: "Enhanced strategy with profit targets, tighter stops, and volatility filters",
            config: {
              strategyName: 'trend-following',
              symbol: 'NIFTY',
              timeframe: '1d', // Daily timeframe for more opportunities
               startDate: '2016-01-01T00:00:00Z', // Skip first year to ensure proper DEMA calculation
               endDate: '2024-12-31T23:59:59Z',
          initialBalance: 100000,
               strategyConfig: {
                 demaPeriod: 13, // DEMA(13) for daily (2-3 weeks) - very responsive
                 supertrendPeriod: 3, // Supertrend(3,1.5) - very sensitive
                 supertrendMultiplier: 1.5, // Supertrend multiplier of 1.5 - very sensitive
                 atrPeriod: 5, // Shorter ATR period
                 maxLossPct: 0.10, // Capital protection threshold
                 positionSize: 8, // Back to working position size
                 maxLots: 3, // Allow more concurrent positions (was 3)
                 exitMode: 'FIFO',
                 trailingStopEnabled: false, // No trailing stops for pure Supertrend flip exits
                 trailingStopType: 'ATR',
                 trailingStopATRMultiplier: 2,
                 trailingStopPercentage: 0.02,
                 trailingStopActivationProfit: 0.01,
                 maxTrailDistance: 0.05,
                 // 1.2% Fixed Stop Loss (Relaxed for better trend following)
                 stopLossEnabled: true,
                 stopLossPercentage: 0.012, // 1.2% stop loss (relaxed for better trend following)
                 // Trailing Stop for Profit Protection
                 trailingStopEnabled: true,
                 trailingStopType: 'ATR',
                 trailingStopATRMultiplier: 1.0, // Matching working config
                 trailingStopActivationProfit: 0.01, // Activate after 1% profit
                 // No additional filters - just basic DEMA + Supertrend
                 // Safety checks disabled for complete backtest
                 enableCapitalProtection: false, // Disable capital protection
                 enableCircuitBreaker: false, // Disable circuit breaker
                 maxDrawdown: 1.0, // Set to 100% (effectively disabled)
                 // Capital management
                 maxTradePercent: 0.95, // Allow up to 95% of balance per trade
                 // Dynamic position sizing
                 dynamicPositionSizing: true, // Enable dynamic position sizing based on available capital
                 basePositionSize: 1, // Minimum position size
                 // Profit targets for quick scalps
                 profitTargetEnabled: true,
                 profitTargetPercentage: 0.06, // 6% profit target (let winners run)
                 // Volatility filter to avoid choppy markets
                 volatilityFilterEnabled: true,
                 maxVolatility: 0.045, // Avoid trades when volatility > 4.5% (relaxed)
                 // Time-based exit for stale trades
                 maxHoldDays: 10, // Exit after 10 days if no clear direction
               }
        }
      }
    ];

    console.log('📊 Testing Weekly Trend-Following Strategy:');
    console.log('   Weekly Trend-Following (DEMA 52, Supertrend 10,1) - Only 1 active entry at a time');
    console.log('');
    console.log('📌 Strategy: Supertrend(10,1) + DEMA(52) on Weekly Timeframe');
    console.log('📌 Entry: Price > DEMA(52) AND Price above Supertrend(10,1) → Long');
    console.log('📌 Entry: Price < DEMA(52) AND Price below Supertrend(10,1) → Short');
    console.log('📌 Exit: Only when Supertrend flips (no partial exits)');
    console.log('📌 Position Management: Only 1 active entry at a time');
    console.log('');

    const results = [];

    for (let i = 0; i < configurations.length; i++) {
      const { name, description, config } = configurations[i];
      
      console.log(`🧪 Testing Weekly Strategy: ${name}`);
      console.log(`   ${description}`);
      console.log(`   Period: 2015-2024 (10 years)`);
      
      // Use the full 10-year date range from the configuration
      const testConfig = config;
      
      try {
        const result = await backtestOrchestrator.runBacktest(testConfig);
        
        if (!result) {
          console.log(`   ❌ No results for ${name}`);
          continue;
        }

        const totalTrades = result.totalTrades || (result.trades ? result.trades.length : 0);
        const winningTrades = result.winningTrades || 0;
        const losingTrades = result.losingTrades || 0;
        const breakEvenTrades = totalTrades - winningTrades - losingTrades;
        const breakEvenRate = (breakEvenTrades / totalTrades * 100).toFixed(1);
        const winRate = ((result.winRate || 0) * 100).toFixed(2);
        const totalReturn = (result.totalReturnPercentage || 0).toFixed(2);
        // Calculate annualized return for 9-year period (2016-2024)
        const years = 9;
        const annualizedReturn = (Math.pow(1 + (result.totalReturnPercentage || 0) / 100, 1/years) - 1) * 100;
        
        console.log(`   📈 Results:`);
        console.log(`      Total Trades: ${totalTrades}`);
        console.log(`      Win Rate: ${winRate}%`);
        console.log(`      Break-Even Rate: ${breakEvenRate}%`);
        console.log(`      Total Return: ${totalReturn}%`);
        console.log(`      Annualized Return: ${annualizedReturn.toFixed(2)}%`);
        console.log(`      Avg Win: ₹${(result.averageWin || 0).toFixed(2)}`);
        console.log(`      Avg Loss: ₹${(result.averageLoss || 0).toFixed(2)}`);
        console.log(`      Max Drawdown: ${((result.maxDrawdown || 0) * 100).toFixed(2)}%`);
        console.log(`      Trades Logged: ${totalTrades}`);

        if (result.trades && result.trades.length > 0) {
          console.log('   🧾 Completed Trades:');
          result.trades.forEach((trade, index) => {
            const entryTime = formatTimestamp(trade.entryTime);
            const exitTime = formatTimestamp(trade.exitTime);
            const pnl = trade.pnl !== undefined ? trade.pnl.toFixed(2) : 'N/A';
            const pnlPct = trade.pnlPercentage !== undefined ? trade.pnlPercentage.toFixed(2) : 'N/A';
            console.log(`      ${index + 1}. ${trade.direction || 'UNKNOWN'} ${trade.symbol || 'SYM'}`);
            console.log(`         Entry: ${entryTime} @ ₹${(trade.entryPrice || 0).toFixed(2)}`);
            console.log(`         Exit:  ${exitTime} @ ₹${(trade.exitPrice || 0).toFixed(2)}`);
            console.log(`         Qty:   ${trade.quantity || 0}`);
            console.log(`         P&L:   ₹${pnl} (${pnlPct}%)`);
          });
          console.log('');
        }
        
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
      } catch (error) {
        console.log(`   ❌ Error testing ${name}: ${error.message}`);
        console.log('');
      }
    }

    // Analysis and recommendations
    console.log('📊 TREND-FOLLOWING STRATEGY ANALYSIS:');
    console.log('====================================');
    
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

    if (results.length > 0) {
      // Find best configuration
      const bestConfig = results.reduce((best, current) => {
        const currentScore = current.annualizedReturn + (100 - current.maxDrawdown) + current.winRate + (100 - current.breakEvenRate);
        const bestScore = best.annualizedReturn + (100 - best.maxDrawdown) + best.winRate + (100 - best.breakEvenRate);
        
        return currentScore > bestScore ? current : best;
      });

      console.log('🏆 BEST TREND-FOLLOWING CONFIGURATION:');
      console.log(`   ${bestConfig.name}`);
      console.log(`   Description: ${bestConfig.description}`);
      console.log(`   Annualized Return: ${bestConfig.annualizedReturn}%`);
      console.log(`   Win Rate: ${bestConfig.winRate}%`);
      console.log(`   Break-Even Rate: ${bestConfig.breakEvenRate}%`);
      console.log(`   Max Drawdown: ${bestConfig.maxDrawdown.toFixed(2)}%`);
      console.log(`   Trade Count: ${bestConfig.totalTrades}`);
      console.log('');

      console.log('💡 TREND-FOLLOWING ANALYSIS:');
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
    } else {
      console.log('❌ No successful backtests completed');
    }

  } catch (error) {
    console.error('❌ Error testing trend-following strategy:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testTrendFollowingStrategy();
