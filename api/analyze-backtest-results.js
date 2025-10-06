const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/data/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/order-execution/providers/mock-order-execution.provider');

async function analyzeBacktestResults() {
  console.log('🔍 ANALYZING BACKTEST RESULTS FOR MATH DISCREPANCY...\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  // Initialize services
  const dataProvider = new CsvDataProvider();
  const orderExecution = new MockOrderExecutionProvider();
  const backtestOrchestrator = new BacktestOrchestratorService(dataProvider, orderExecution);

  // Optimized strategy configuration
  const optimizedConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'optimized-strategy-analysis',
      name: 'Optimized Strategy Analysis',
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
      maxLots: 8,
      pyramidingEnabled: true,
      exitMode: 'FIFO',
      misExitTime: null,
      cncExitTime: null
    }
  };

  try {
    console.log('📊 Running detailed backtest analysis...\n');
    const results = await backtestOrchestrator.runBacktest(optimizedConfig);

    console.log('================================================================================');
    console.log('🔍 DETAILED BACKTEST ANALYSIS');
    console.log('================================================================================\n');

    // Basic metrics
    console.log('📈 BASIC METRICS:');
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   📉 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   📊 Total Trades: ${results.totalTrades}`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);
    console.log(`   📊 Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}\n`);

    // Trade breakdown
    console.log('📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   💚 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   💔 Average Loss: ₹${results.averageLoss.toFixed(2)}\n`);

    // Math verification
    console.log('🧮 MATH VERIFICATION:');
    const expectedReturn = (results.winningTrades * results.averageWin) + (results.losingTrades * results.averageLoss);
    console.log(`   📊 Expected Return: ₹${expectedReturn.toFixed(2)}`);
    console.log(`   📊 Actual Return: ₹${results.totalReturn.toFixed(2)}`);
    console.log(`   📊 Difference: ₹${(results.totalReturn - expectedReturn).toFixed(2)}`);
    console.log(`   📊 Math Check: ${Math.abs(results.totalReturn - expectedReturn) < 1 ? '✅ CORRECT' : '❌ DISCREPANCY'}\n`);

    // Risk/Reward analysis
    const lossRatio = Math.abs(results.averageLoss) / results.averageWin;
    const riskRewardRatio = results.averageWin / Math.abs(results.averageLoss);
    console.log('🎯 RISK/REWARD ANALYSIS:');
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x`);
    console.log(`   📊 Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}x`);
    console.log(`   📊 Expected Performance: ${riskRewardRatio > 1 ? '✅ POSITIVE' : '❌ NEGATIVE'}\n`);

    // Drawdown analysis
    console.log('📉 DRAWDOWN ANALYSIS:');
    if (results.equityCurve && results.equityCurve.length > 0) {
      const equityValues = results.equityCurve.map(point => point.equity);
      const peak = Math.max(...equityValues);
      const trough = Math.min(...equityValues);
      const maxDD = ((peak - trough) / peak) * 100;
      
      console.log(`   📊 Peak Equity: ₹${peak.toFixed(2)}`);
      console.log(`   📊 Trough Equity: ₹${trough.toFixed(2)}`);
      console.log(`   📊 Calculated Max DD: ${maxDD.toFixed(2)}%`);
      console.log(`   📊 Reported Max DD: ${(results.maxDrawdown * 100).toFixed(2)}%\n`);
    }

    // Trade analysis
    console.log('📊 TRADE ANALYSIS:');
    const trades = results.trades || [];
    if (trades.length > 0) {
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      
      console.log(`   📊 Total P&L from trades: ₹${trades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}`);
      console.log(`   📊 Winning trades P&L: ₹${winningTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}`);
      console.log(`   📊 Losing trades P&L: ₹${losingTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}`);
      
      // Find max loss trade
      const maxLossTrade = trades.reduce((min, trade) => trade.pnl < min.pnl ? trade : min, trades[0]);
      console.log(`   📊 Max Loss Trade: ₹${maxLossTrade.pnl.toFixed(2)} (${maxLossTrade.pnlPercentage.toFixed(2)}%)`);
      
      // Find max win trade
      const maxWinTrade = trades.reduce((max, trade) => trade.pnl > max.pnl ? trade : max, trades[0]);
      console.log(`   📊 Max Win Trade: ₹${maxWinTrade.pnl.toFixed(2)} (${maxWinTrade.pnlPercentage.toFixed(2)}%)\n`);
    }

    // Duration analysis
    console.log('⏱️ DURATION ANALYSIS:');
    if (results.equityCurve && results.equityCurve.length > 0) {
      const startDate = new Date(results.equityCurve[0].timestamp);
      const endDate = new Date(results.equityCurve[results.equityCurve.length - 1].timestamp);
      const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      
      console.log(`   📅 Start Date: ${startDate.toISOString().split('T')[0]}`);
      console.log(`   📅 End Date: ${endDate.toISOString().split('T')[0]}`);
      console.log(`   📅 Duration: ${durationDays.toFixed(0)} days\n`);
    }

    console.log('🎯 CONCLUSION:');
    if (Math.abs(results.totalReturn - expectedReturn) > 1) {
      console.log('   ❌ MATH DISCREPANCY DETECTED!');
      console.log('   🔍 Possible causes:');
      console.log('      - Unrealized P&L not included in trade calculations');
      console.log('      - Position sizing issues');
      console.log('      - Pyramiding calculation errors');
      console.log('      - Balance vs trade P&L mismatch');
    } else {
      console.log('   ✅ Math appears correct');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

analyzeBacktestResults().catch(console.error);
