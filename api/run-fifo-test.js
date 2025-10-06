const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/trading/providers/mock-order-execution');

async function runFifoTest() {
  console.log('🚀 RUNNING FIFO STRATEGY TEST...\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const backtestOrchestrator = new BacktestOrchestratorService(dataProvider, orderExecution);

  // FIFO Strategy Configuration
  const fifoConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'fifo-strategy-test',
      name: 'FIFO Strategy Test',
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
      exitMode: 'FIFO', // FIFO Strategy
      misExitTime: null,
      cncExitTime: null
    }
  };

  try {
    console.log('📊 FIFO STRATEGY CONFIGURATION:');
    console.log('   🔧 Max Lots: 4 (reduced from 8)');
    console.log('   🔧 Exit Mode: FIFO (First In, First Out)');
    console.log('   🔧 Strategy: Advanced ATR with pyramiding');
    console.log('   🔧 Test Period: 2024 (full year)\n');

    console.log('📈 Running FIFO backtest...\n');
    const results = await backtestOrchestrator.runBacktest(fifoConfig);

    console.log('================================================================================');
    console.log('🎯 FIFO STRATEGY BACKTEST RESULTS');
    console.log('================================================================================\n');

    // Performance metrics
    console.log('💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);

    // Trade breakdown
    console.log('\n📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);

    // Risk/Reward analysis
    const lossRatio = Math.abs(results.averageLoss) / results.averageWin;
    const riskRewardRatio = results.averageWin / Math.abs(results.averageLoss);
    
    console.log('\n🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}x (target: >0.67x)`);
    console.log(`   📊 Win/Loss Balance: ${lossRatio < 1.5 ? '✅ GOOD' : '❌ POOR'}`);

    // Drawdown analysis
    console.log('\n📉 DRAWDOWN ANALYSIS:');
    console.log(`   📊 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    if (results.equityCurve && results.equityCurve.length > 0) {
      const equityValues = results.equityCurve.map(point => point.equity);
      const peakEquity = Math.max(...equityValues);
      const troughEquity = Math.min(...equityValues);
      const calculatedMaxDD = ((peakEquity - troughEquity) / peakEquity) * 100;
      console.log(`   📊 Peak Equity: ₹${peakEquity.toFixed(2)}`);
      console.log(`   📊 Trough Equity: ₹${troughEquity.toFixed(2)}`);
      console.log(`   📊 Calculated Max DD: ${calculatedMaxDD.toFixed(2)}%`);
    }

    // FIFO Strategy Analysis
    console.log('\n🔍 FIFO STRATEGY ANALYSIS:');
    console.log('   📊 FIFO Benefits:');
    console.log('      ✅ Takes profits from early entries');
    console.log('      ✅ Better for trend-following strategies');
    console.log('      ✅ Simpler exit logic');
    console.log('   📊 FIFO Drawbacks:');
    console.log('      ❌ May leave losses in later positions');
    console.log('      ❌ Can be problematic with pyramiding');

    // Math verification
    console.log('\n🧮 MATH VERIFICATION:');
    const expectedReturn = (results.winningTrades * results.averageWin) + (results.losingTrades * results.averageLoss);
    console.log(`   📊 Expected Return: ₹${expectedReturn.toFixed(2)}`);
    console.log(`   📊 Actual Return: ₹${results.totalReturn.toFixed(2)}`);
    console.log(`   📊 Difference: ₹${(results.totalReturn - expectedReturn).toFixed(2)}`);
    console.log(`   📊 Math Check: ${Math.abs(results.totalReturn - expectedReturn) < 1 ? '✅ CORRECT' : '❌ DISCREPANCY'}`);

    console.log('\n🎉 FIFO strategy backtest completed!\n');
    
    // Return results for comparison
    return {
      ...results,
      lossRatio,
      riskRewardRatio,
      strategy: 'FIFO'
    };

  } catch (error) {
    console.error('❌ FIFO backtest failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

runFifoTest().catch(console.error);
