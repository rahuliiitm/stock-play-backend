const axios = require('axios');

/**
 * Run 10-year backtest with optimal configuration and detailed analysis
 */
async function runOptimal10YearBacktest() {
  console.log('🚀 Running 10-year backtest with optimal configuration...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Optimal configuration based on analysis
  const optimalConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2015-01-09T00:00:00.000Z'),
    endDate: new Date('2025-07-25T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'optimal-10year',
      name: 'Optimal 10-Year EMA-Gap-ATR Strategy',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrMultiplierEntry: 0.05,        // Very permissive for more trades
      atrMultiplierUnwind: 0.3,        // ATR threshold for exits
      strongCandleThreshold: 0.01,     // Allow weak candles
      gapUpDownThreshold: 0.01,        // Allow small gaps
      rsiPeriod: 14,
      rsiEntryLong: 60,                // More permissive RSI
      rsiEntryShort: 40,               // More permissive RSI
      rsiExitLong: 45,
      rsiExitShort: 55,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 5,                      // Allow pyramiding up to 5 lots
      pyramidingEnabled: true,         // Enable pyramiding
      exitMode: 'FIFO',               // FIFO exit strategy
      misExitTime: '15:15',
      cncExitTime: '15:15'
    }
  };
  
  try {
    console.log('📤 Sending optimal backtest request...');
    console.log('⚙️  Configuration:');
    console.log(`   📊 ATR Multiplier Entry: ${optimalConfig.strategyConfig.atrMultiplierEntry}`);
    console.log(`   💪 Strong Candle Threshold: ${optimalConfig.strategyConfig.strongCandleThreshold}`);
    console.log(`   📏 Gap Up/Down Threshold: ${optimalConfig.strategyConfig.gapUpDownThreshold}`);
    console.log(`   📊 RSI Entry Long/Short: ${optimalConfig.strategyConfig.rsiEntryLong}/${optimalConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   🔄 Pyramiding Enabled: ${optimalConfig.strategyConfig.pyramidingEnabled}`);
    console.log(`   📤 Max Lots: ${optimalConfig.strategyConfig.maxLots}`);
    console.log(`   🚪 Exit Mode: ${optimalConfig.strategyConfig.exitMode}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, optimalConfig, {
      timeout: 300000 // 5 minutes timeout for full 10-year dataset
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n✅ Backtest completed in ${duration.toFixed(2)}s`);
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 10-YEAR OPTIMAL BACKTEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n💰 PERFORMANCE METRICS:`);
    console.log(`   📈 Total Trades: ${response.data.totalTrades || 0}`);
    console.log(`   💵 Total Return: ${response.data.totalReturnPercentage || 0}%`);
    console.log(`   💰 Final Balance: ₹${(response.data.finalBalance || 0).toLocaleString()}`);
    console.log(`   🎯 Win Rate: ${response.data.winRate || 0}%`);
    console.log(`   📉 Max Drawdown: ${response.data.maxDrawdown || 0}%`);
    console.log(`   📊 Sharpe Ratio: ${response.data.sharpeRatio || 0}`);
    
    // Risk metrics
    if (response.data.riskMetrics) {
      console.log(`\n⚠️  RISK METRICS:`);
      console.log(`   📊 VaR (95%): ${response.data.riskMetrics.var95 || 0}%`);
      console.log(`   📊 Sortino Ratio: ${response.data.riskMetrics.sortinoRatio || 0}`);
      console.log(`   📊 Calmar Ratio: ${response.data.riskMetrics.calmarRatio || 0}`);
    }
    
    // Trade analysis
    if (response.data.tradeAnalysis) {
      console.log(`\n📊 TRADE ANALYSIS:`);
      console.log(`   📈 Average Win: ${response.data.tradeAnalysis.avgWin || 0}%`);
      console.log(`   📉 Average Loss: ${response.data.tradeAnalysis.avgLoss || 0}%`);
      console.log(`   📊 Profit Factor: ${response.data.tradeAnalysis.profitFactor || 0}`);
      console.log(`   ⏱️  Average Holding Period: ${response.data.tradeAnalysis.avgHoldingPeriod || 0} periods`);
    }
    
    // Pyramiding analysis
    if (response.data.pyramidingAnalysis) {
      console.log(`\n🔄 PYRAMIDING ANALYSIS:`);
      console.log(`   📊 Total Pyramiding Events: ${response.data.pyramidingAnalysis.totalPyramidingEvents || 0}`);
      console.log(`   📈 Average Pyramiding Size: ${response.data.pyramidingAnalysis.avgPyramidingSize || 0}`);
      console.log(`   💰 Pyramiding PnL: ${response.data.pyramidingAnalysis.pyramidingPnL || 0}%`);
    }
    
    // FIFO exit analysis
    if (response.data.fifoAnalysis) {
      console.log(`\n🚪 FIFO EXIT ANALYSIS:`);
      console.log(`   📊 Total FIFO Exits: ${response.data.fifoAnalysis.totalFifoExits || 0}`);
      console.log(`   📉 ATR-Based Exits: ${response.data.fifoAnalysis.atrBasedExits || 0}`);
      console.log(`   ⏰ Time-Based Exits: ${response.data.fifoAnalysis.timeBasedExits || 0}`);
    }
    
    // Monthly/Yearly breakdown if available
    if (response.data.periodicBreakdown) {
      console.log(`\n📅 PERIODIC BREAKDOWN:`);
      console.log(`   📊 Best Year: ${response.data.periodicBreakdown.bestYear || 'N/A'}`);
      console.log(`   📊 Worst Year: ${response.data.periodicBreakdown.worstYear || 'N/A'}`);
      console.log(`   📊 Best Month: ${response.data.periodicBreakdown.bestMonth || 'N/A'}`);
      console.log(`   📊 Worst Month: ${response.data.periodicBreakdown.worstMonth || 'N/A'}`);
    }
    
    console.log('\n🎉 Optimal 10-year backtest completed successfully!');
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Error in optimal backtest:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the optimal backtest
runOptimal10YearBacktest().catch(error => {
  console.error('❌ Optimal backtest failed:', error);
});
