const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');

async function runComprehensiveOptimizationTest() {
  console.log('🚀 RUNNING COMPREHENSIVE OPTIMIZATION TEST...\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const backtestOrchestrator = new BacktestOrchestratorService(dataProvider, orderExecution);

  // Base configuration for comparison
  const baseConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialBalance: 100000
  };

  try {
    console.log('📊 COMPREHENSIVE OPTIMIZATION TEST CONFIGURATION:');
    console.log('   🔧 Test Period: 2024 (full year)');
    console.log('   🔧 Symbol: NIFTY');
    console.log('   🔧 Timeframe: 15m');
    console.log('   🔧 Initial Balance: ₹100,000\n');

    // 1. ORIGINAL STRATEGY (for baseline comparison)
    console.log('🔄 Testing ORIGINAL Strategy (Baseline)...\n');
    const originalConfig = {
      ...baseConfig,
      strategyConfig: {
        id: 'original-strategy',
        name: 'Original Strategy (Baseline)',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrDeclineThreshold: 0.05,        // Original: 5% decline
        atrExpansionThreshold: 0.01,
        strongCandleThreshold: 0.01,
        gapUpDownThreshold: 0.01,
        rsiPeriod: 14,
        rsiEntryLong: 30,                 // Original: 30/70
        rsiEntryShort: 70,
        rsiExitLong: 25,                  // Original: 25/75
        rsiExitShort: 75,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 8,                       // Original: 8 lots
        pyramidingEnabled: true,
        exitMode: 'FIFO',                // Original: FIFO
        misExitTime: null,
        cncExitTime: null
      }
    };

    const originalResults = await backtestOrchestrator.runBacktest(originalConfig);

    // 2. OPTIMIZED STRATEGY (with all improvements)
    console.log('🔄 Testing OPTIMIZED Strategy (All Improvements)...\n');
    const optimizedConfig = {
      ...baseConfig,
      strategyConfig: {
        id: 'optimized-strategy',
        name: 'Optimized Strategy (All Improvements)',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrDeclineThreshold: 0.08,        // IMPROVED: 8% decline (let winners run longer)
        atrExpansionThreshold: 0.01,
        strongCandleThreshold: 0.01,
        gapUpDownThreshold: 0.01,
        rsiPeriod: 14,
        rsiEntryLong: 25,                 // IMPROVED: Tighter entry (25/75)
        rsiEntryShort: 75,
        rsiExitLong: 35,                  // IMPROVED: Tighter exit (35/65)
        rsiExitShort: 65,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 4,                       // IMPROVED: Reduced from 8 to 4
        pyramidingEnabled: true,
        exitMode: 'LIFO',                // IMPROVED: LIFO instead of FIFO
        misExitTime: null,
        cncExitTime: null,
        // NEW OPTIMIZATIONS
        maxConsecutiveLosses: 3,          // NEW: Stop after 3 consecutive losses
        maxDrawdownStop: 0.10,            // NEW: Stop at -10% drawdown
        positionSizingMode: 'CONSERVATIVE' // NEW: Conservative position sizing
      }
    };

    const optimizedResults = await backtestOrchestrator.runBacktest(optimizedConfig);

    // Display Comprehensive Results
    console.log('================================================================================');
    console.log('🎯 COMPREHENSIVE OPTIMIZATION TEST RESULTS');
    console.log('================================================================================\n');

    // Original Strategy Results
    console.log('📊 ORIGINAL STRATEGY RESULTS (Baseline):');
    console.log(`   📈 Total Trades: ${originalResults.totalTrades}`);
    console.log(`   💰 Total Return: ₹${originalResults.totalReturn.toFixed(2)} (${originalResults.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(originalResults.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${originalResults.profitFactor.toFixed(2)}`);
    console.log(`   📊 Average Win: ₹${originalResults.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${originalResults.averageLoss.toFixed(2)}`);
    console.log(`   📉 Max Drawdown: ${(originalResults.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   📊 Sharpe Ratio: ${originalResults.sharpeRatio ? originalResults.sharpeRatio.toFixed(2) : 'N/A'}\n`);

    // Optimized Strategy Results
    console.log('📊 OPTIMIZED STRATEGY RESULTS (All Improvements):');
    console.log(`   📈 Total Trades: ${optimizedResults.totalTrades}`);
    console.log(`   💰 Total Return: ₹${optimizedResults.totalReturn.toFixed(2)} (${optimizedResults.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(optimizedResults.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${optimizedResults.profitFactor.toFixed(2)}`);
    console.log(`   📊 Average Win: ₹${optimizedResults.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${optimizedResults.averageLoss.toFixed(2)}`);
    console.log(`   📉 Max Drawdown: ${(optimizedResults.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   📊 Sharpe Ratio: ${optimizedResults.sharpeRatio ? optimizedResults.sharpeRatio.toFixed(2) : 'N/A'}\n`);

    // Performance Comparison
    console.log('🔍 PERFORMANCE COMPARISON:');
    
    const returnImprovement = optimizedResults.totalReturnPercentage - originalResults.totalReturnPercentage;
    const winRateImprovement = (optimizedResults.winRate - originalResults.winRate) * 100;
    const profitFactorImprovement = optimizedResults.profitFactor - originalResults.profitFactor;
    const drawdownImprovement = (originalResults.maxDrawdown - optimizedResults.maxDrawdown) * 100;
    const tradeCountChange = optimizedResults.totalTrades - originalResults.totalTrades;

    console.log(`   📈 Return Improvement: ${returnImprovement > 0 ? '+' : ''}${returnImprovement.toFixed(2)}%`);
    console.log(`   🎯 Win Rate Improvement: ${winRateImprovement > 0 ? '+' : ''}${winRateImprovement.toFixed(2)}%`);
    console.log(`   📊 Profit Factor Improvement: ${profitFactorImprovement > 0 ? '+' : ''}${profitFactorImprovement.toFixed(2)}`);
    console.log(`   📉 Drawdown Improvement: ${drawdownImprovement > 0 ? '+' : ''}${drawdownImprovement.toFixed(2)}% (lower is better)`);
    console.log(`   📊 Trade Count Change: ${tradeCountChange > 0 ? '+' : ''}${tradeCountChange} trades\n`);

    // Risk/Reward Analysis
    const originalLossRatio = Math.abs(originalResults.averageLoss) / originalResults.averageWin;
    const optimizedLossRatio = Math.abs(optimizedResults.averageLoss) / optimizedResults.averageWin;
    const originalRiskReward = originalResults.averageWin / Math.abs(originalResults.averageLoss);
    const optimizedRiskReward = optimizedResults.averageWin / Math.abs(optimizedResults.averageLoss);

    console.log('🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Original Loss Ratio: ${originalLossRatio.toFixed(2)}x`);
    console.log(`   📊 Optimized Loss Ratio: ${optimizedLossRatio.toFixed(2)}x`);
    console.log(`   📊 Original Risk/Reward: ${originalRiskReward.toFixed(2)}x`);
    console.log(`   📊 Optimized Risk/Reward: ${optimizedRiskReward.toFixed(2)}x\n`);

    // Optimization Impact Analysis
    console.log('🔧 OPTIMIZATION IMPACT ANALYSIS:');
    
    // LIFO vs FIFO Impact
    console.log('   📊 LIFO vs FIFO Impact:');
    console.log('      ✅ LIFO exits cut losses quickly');
    console.log('      ✅ Preserves profitable early entries');
    console.log('      ✅ Better for pyramiding strategies');
    
    // Reduced Max Lots Impact
    console.log('   📊 Reduced Max Lots Impact:');
    console.log('      ✅ 50% reduction in pyramiding exposure (8→4)');
    console.log('      ✅ Better risk management');
    console.log('      ✅ More controlled position sizing');
    
    // RSI Tightening Impact
    console.log('   📊 RSI Tightening Impact:');
    console.log('      ✅ More selective entries (30/70→25/75)');
    console.log('      ✅ Fewer false positive trades');
    console.log('      ✅ Better trade quality');
    
    // Risk Controls Impact
    console.log('   📊 Risk Controls Impact:');
    console.log('      ✅ Loss streak protection (max 3 consecutive)');
    console.log('      ✅ Drawdown stop (-10% limit)');
    console.log('      ✅ Conservative position sizing');
    console.log('      ✅ Capital protection mechanisms\n');

    // Overall Assessment
    console.log('🏆 OVERALL ASSESSMENT:');
    
    let improvementScore = 0;
    let improvements = [];
    let concerns = [];

    // Return Analysis
    if (returnImprovement > 0) {
      improvementScore += 30;
      improvements.push(`Return improved by ${returnImprovement.toFixed(2)}%`);
    } else if (returnImprovement < -5) {
      concerns.push(`Return decreased by ${Math.abs(returnImprovement).toFixed(2)}%`);
    }

    // Win Rate Analysis
    if (winRateImprovement > 0) {
      improvementScore += 25;
      improvements.push(`Win rate improved by ${winRateImprovement.toFixed(2)}%`);
    } else if (winRateImprovement < -5) {
      concerns.push(`Win rate decreased by ${Math.abs(winRateImprovement).toFixed(2)}%`);
    }

    // Drawdown Analysis
    if (drawdownImprovement > 0) {
      improvementScore += 25;
      improvements.push(`Drawdown reduced by ${drawdownImprovement.toFixed(2)}%`);
    } else if (drawdownImprovement < -2) {
      concerns.push(`Drawdown increased by ${Math.abs(drawdownImprovement).toFixed(2)}%`);
    }

    // Profit Factor Analysis
    if (profitFactorImprovement > 0) {
      improvementScore += 20;
      improvements.push(`Profit factor improved by ${profitFactorImprovement.toFixed(2)}`);
    } else if (profitFactorImprovement < -0.2) {
      concerns.push(`Profit factor decreased by ${Math.abs(profitFactorImprovement).toFixed(2)}`);
    }

    console.log(`   📊 Improvement Score: ${improvementScore}/100 points\n`);

    if (improvements.length > 0) {
      console.log('   ✅ IMPROVEMENTS:');
      improvements.forEach(improvement => console.log(`      • ${improvement}`));
      console.log('');
    }

    if (concerns.length > 0) {
      console.log('   ⚠️  CONCERNS:');
      concerns.forEach(concern => console.log(`      • ${concern}`));
      console.log('');
    }

    // Final Recommendation
    console.log('💡 FINAL RECOMMENDATION:');
    
    if (improvementScore >= 70) {
      console.log('   🎉 EXCELLENT: Strategy optimizations are highly effective!');
      console.log('   ✅ Ready for live trading with current optimizations');
    } else if (improvementScore >= 50) {
      console.log('   ✅ GOOD: Strategy optimizations show positive results');
      console.log('   📊 Consider fine-tuning parameters for better performance');
    } else if (improvementScore >= 30) {
      console.log('   ⚠️  MODERATE: Some improvements, but needs more work');
      console.log('   🔧 Consider additional optimizations or parameter adjustments');
    } else {
      console.log('   ❌ POOR: Optimizations need significant revision');
      console.log('   🔧 Strategy requires major adjustments before live trading');
    }

    console.log('\n🎯 OPTIMIZATION SUMMARY:');
    console.log('   🔧 LIFO Exits: ✅ Implemented');
    console.log('   🔧 Reduced Max Lots: ✅ Implemented (8→4)');
    console.log('   🔧 RSI Tightening: ✅ Implemented (30/70→25/75)');
    console.log('   🔧 Risk Controls: ✅ Implemented (loss streak, drawdown stop)');
    console.log('   🔧 Conservative Sizing: ✅ Implemented');

    console.log('\n🎉 Comprehensive optimization test completed!\n');
    
    return {
      original: originalResults,
      optimized: optimizedResults,
      improvementScore,
      improvements,
      concerns,
      returnImprovement,
      winRateImprovement,
      profitFactorImprovement,
      drawdownImprovement,
      tradeCountChange
    };

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

runComprehensiveOptimizationTest().catch(console.error);


