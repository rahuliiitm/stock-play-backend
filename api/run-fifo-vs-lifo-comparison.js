const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');

async function runFifoVsLifoComparison() {
  console.log('🚀 RUNNING FIFO vs LIFO COMPARISON TEST...\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const backtestOrchestrator = new BacktestOrchestratorService(dataProvider, orderExecution);

  // Base configuration
  const baseConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'comparison-test',
      name: 'FIFO vs LIFO Comparison',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrDeclineThreshold: 0.08,
      atrExpansionThreshold: 0.01,
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 30,
      rsiEntryShort: 70,
      rsiExitLong: 35,
      rsiExitShort: 65,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 4,
      pyramidingEnabled: true,
      misExitTime: null,
      cncExitTime: null
    }
  };

  try {
    console.log('📊 COMPARISON TEST CONFIGURATION:');
    console.log('   🔧 Max Lots: 4 (reduced from 8)');
    console.log('   🔧 Strategy: Advanced ATR with pyramiding');
    console.log('   🔧 Test Period: 2024 (full year)');
    console.log('   🔧 Exit Strategies: FIFO vs LIFO\n');

    // Test FIFO Strategy
    console.log('🔄 Testing FIFO Strategy...\n');
    const fifoConfig = {
      ...baseConfig,
      strategyConfig: {
        ...baseConfig.strategyConfig,
        id: 'fifo-test',
        name: 'FIFO Strategy Test',
        exitMode: 'FIFO'
      }
    };

    const fifoResults = await backtestOrchestrator.runBacktest(fifoConfig);

    // Test LIFO Strategy
    console.log('🔄 Testing LIFO Strategy...\n');
    const lifoConfig = {
      ...baseConfig,
      strategyConfig: {
        ...baseConfig.strategyConfig,
        id: 'lifo-test',
        name: 'LIFO Strategy Test',
        exitMode: 'LIFO'
      }
    };

    const lifoResults = await backtestOrchestrator.runBacktest(lifoConfig);

    // Display Results
    console.log('================================================================================');
    console.log('🎯 FIFO vs LIFO COMPARISON RESULTS');
    console.log('================================================================================\n');

    // FIFO Results
    console.log('📊 FIFO STRATEGY RESULTS:');
    console.log(`   📈 Total Trades: ${fifoResults.totalTrades}`);
    console.log(`   💰 Total Return: ₹${fifoResults.totalReturn.toFixed(2)} (${fifoResults.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(fifoResults.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${fifoResults.profitFactor.toFixed(2)}`);
    console.log(`   📊 Average Win: ₹${fifoResults.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${fifoResults.averageLoss.toFixed(2)}`);
    console.log(`   📉 Max Drawdown: ${(fifoResults.maxDrawdown * 100).toFixed(2)}%\n`);

    // LIFO Results
    console.log('📊 LIFO STRATEGY RESULTS:');
    console.log(`   📈 Total Trades: ${lifoResults.totalTrades}`);
    console.log(`   💰 Total Return: ₹${lifoResults.totalReturn.toFixed(2)} (${lifoResults.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(lifoResults.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${lifoResults.profitFactor.toFixed(2)}`);
    console.log(`   📊 Average Win: ₹${lifoResults.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${lifoResults.averageLoss.toFixed(2)}`);
    console.log(`   📉 Max Drawdown: ${(lifoResults.maxDrawdown * 100).toFixed(2)}%\n`);

    // Comparison Analysis
    console.log('🔍 COMPARISON ANALYSIS:');
    
    const returnDifference = lifoResults.totalReturnPercentage - fifoResults.totalReturnPercentage;
    const winRateDifference = (lifoResults.winRate - fifoResults.winRate) * 100;
    const profitFactorDifference = lifoResults.profitFactor - fifoResults.profitFactor;
    const drawdownDifference = (lifoResults.maxDrawdown - fifoResults.maxDrawdown) * 100;

    console.log(`   📈 Return Difference: ${returnDifference > 0 ? '+' : ''}${returnDifference.toFixed(2)}% (LIFO vs FIFO)`);
    console.log(`   🎯 Win Rate Difference: ${winRateDifference > 0 ? '+' : ''}${winRateDifference.toFixed(2)}% (LIFO vs FIFO)`);
    console.log(`   📊 Profit Factor Difference: ${profitFactorDifference > 0 ? '+' : ''}${profitFactorDifference.toFixed(2)} (LIFO vs FIFO)`);
    console.log(`   📉 Drawdown Difference: ${drawdownDifference > 0 ? '+' : ''}${drawdownDifference.toFixed(2)}% (LIFO vs FIFO)\n`);

    // Risk/Reward Analysis
    const fifoLossRatio = Math.abs(fifoResults.averageLoss) / fifoResults.averageWin;
    const lifoLossRatio = Math.abs(lifoResults.averageLoss) / lifoResults.averageWin;
    const fifoRiskReward = fifoResults.averageWin / Math.abs(fifoResults.averageLoss);
    const lifoRiskReward = lifoResults.averageWin / Math.abs(lifoResults.averageLoss);

    console.log('🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 FIFO Loss Ratio: ${fifoLossRatio.toFixed(2)}x`);
    console.log(`   📊 LIFO Loss Ratio: ${lifoLossRatio.toFixed(2)}x`);
    console.log(`   📊 FIFO Risk/Reward: ${fifoRiskReward.toFixed(2)}x`);
    console.log(`   📊 LIFO Risk/Reward: ${lifoRiskReward.toFixed(2)}x\n`);

    // Winner Analysis
    console.log('🏆 WINNER ANALYSIS:');
    
    let winner = 'TIE';
    let winnerScore = 0;
    
    // Return comparison (40% weight)
    if (Math.abs(returnDifference) > 0.1) {
      if (returnDifference > 0) {
        winnerScore += 40;
        console.log('   ✅ LIFO wins on Return');
      } else {
        winnerScore -= 40;
        console.log('   ✅ FIFO wins on Return');
      }
    }
    
    // Win Rate comparison (25% weight)
    if (Math.abs(winRateDifference) > 1) {
      if (winRateDifference > 0) {
        winnerScore += 25;
        console.log('   ✅ LIFO wins on Win Rate');
      } else {
        winnerScore -= 25;
        console.log('   ✅ FIFO wins on Win Rate');
      }
    }
    
    // Profit Factor comparison (20% weight)
    if (Math.abs(profitFactorDifference) > 0.1) {
      if (profitFactorDifference > 0) {
        winnerScore += 20;
        console.log('   ✅ LIFO wins on Profit Factor');
      } else {
        winnerScore -= 20;
        console.log('   ✅ FIFO wins on Profit Factor');
      }
    }
    
    // Drawdown comparison (15% weight)
    if (Math.abs(drawdownDifference) > 0.1) {
      if (drawdownDifference < 0) { // Lower drawdown is better
        winnerScore += 15;
        console.log('   ✅ LIFO wins on Drawdown');
      } else {
        winnerScore -= 15;
        console.log('   ✅ FIFO wins on Drawdown');
      }
    }

    if (winnerScore > 10) {
      winner = 'LIFO';
    } else if (winnerScore < -10) {
      winner = 'FIFO';
    }

    console.log(`\n🏆 OVERALL WINNER: ${winner}`);
    console.log(`   📊 Winner Score: ${winnerScore} points\n`);

    // Strategy Insights
    console.log('💡 STRATEGY INSIGHTS:');
    
    if (winner === 'LIFO') {
      console.log('   🎯 LIFO Strategy Benefits:');
      console.log('      ✅ Better risk management (cuts losses quickly)');
      console.log('      ✅ Preserves profitable early entries');
      console.log('      ✅ Better for pyramiding strategies');
      console.log('      ✅ Reduced maximum drawdown');
    } else if (winner === 'FIFO') {
      console.log('   🎯 FIFO Strategy Benefits:');
      console.log('      ✅ Takes profits from early entries');
      console.log('      ✅ Better for trend-following strategies');
      console.log('      ✅ Simpler exit logic');
    } else {
      console.log('   🎯 Both strategies perform similarly:');
      console.log('      📊 Consider market conditions for strategy selection');
      console.log('      📊 LIFO better for volatile markets');
      console.log('      📊 FIFO better for trending markets');
    }

    console.log('\n🔧 OPTIMIZATION RECOMMENDATIONS:');
    console.log('   1. Use LIFO for volatile/choppy markets');
    console.log('   2. Use FIFO for strong trending markets');
    console.log('   3. Consider dynamic exit strategy based on market conditions');
    console.log('   4. Implement both strategies and switch based on volatility');

    console.log('\n🎉 FIFO vs LIFO comparison completed!\n');
    
    return {
      fifo: fifoResults,
      lifo: lifoResults,
      winner,
      winnerScore,
      returnDifference,
      winRateDifference,
      profitFactorDifference,
      drawdownDifference
    };

  } catch (error) {
    console.error('❌ Comparison test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

runFifoVsLifoComparison().catch(console.error);


