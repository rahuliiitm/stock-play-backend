const axios = require('axios');

/**
 * Analyze pyramiding and FIFO exit behavior with detailed tabular data
 */
async function analyzePyramidingFifo() {
  console.log('🔍 Analyzing pyramiding and FIFO exit behavior...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Configuration optimized for detailed analysis
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'pyramiding-fifo-analysis',
      name: 'Pyramiding FIFO Analysis',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrMultiplierEntry: 0.05,
      atrMultiplierUnwind: 0.3,        // Key parameter for ATR-based exits
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 60,
      rsiEntryShort: 40,
      rsiExitLong: 45,
      rsiExitShort: 55,
      slopeLookback: 3,
      capital: 100000,
      maxLossPct: 0.05,
      positionSize: 1,
      maxLots: 5,                        // Enable pyramiding
      pyramidingEnabled: true,           // Enable pyramiding
      exitMode: 'FIFO',                 // FIFO exit strategy
      misExitTime: '15:15',
      cncExitTime: '15:15'
    }
  };
  
  try {
    console.log('📤 Running backtest for pyramiding/FIFO analysis...');
    const startTime = Date.now();
    
    const response = await axios.post(`${baseUrl}/backtest/run`, config, {
      timeout: 120000 // 2 minutes timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Analysis completed in ${duration.toFixed(2)}s`);
    
    // Display comprehensive results
    console.log('\n' + '='.repeat(100));
    console.log('📊 PYRAMIDING & FIFO EXIT ANALYSIS RESULTS');
    console.log('='.repeat(100));
    
    console.log(`\n💰 OVERALL PERFORMANCE:`);
    console.log(`   📈 Total Trades: ${response.data.totalTrades || 0}`);
    console.log(`   💵 Total Return: ${response.data.totalReturnPercentage || 0}%`);
    console.log(`   💰 Final Balance: ₹${(response.data.finalBalance || 0).toLocaleString()}`);
    console.log(`   🎯 Win Rate: ${response.data.winRate || 0}%`);
    console.log(`   📉 Max Drawdown: ${response.data.maxDrawdown || 0}%`);
    
    // Pyramiding Analysis Table
    console.log('\n🔄 PYRAMIDING BEHAVIOR ANALYSIS:');
    console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│ Metric                          │ Value    │ % of Total│ Avg per Trade│ Max     │ Min     │');
    console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
    
    const totalTrades = response.data.totalTrades || 0;
    const pyramidingEvents = response.data.pyramidingAnalysis?.totalPyramidingEvents || 0;
    const avgPyramidingSize = response.data.pyramidingAnalysis?.avgPyramidingSize || 0;
    const maxPyramidingSize = response.data.pyramidingAnalysis?.maxPyramidingSize || 0;
    const minPyramidingSize = response.data.pyramidingAnalysis?.minPyramidingSize || 0;
    
    console.log(`│ Total Pyramiding Events        │ ${pyramidingEvents.toString().padStart(8)} │ ${((pyramidingEvents/totalTrades)*100).toFixed(1).padStart(8)}% │ ${avgPyramidingSize.toFixed(2).padStart(8)} │ ${maxPyramidingSize.toString().padStart(8)} │ ${minPyramidingSize.toString().padStart(8)} │`);
    console.log(`│ Pyramiding Success Rate        │ ${((response.data.pyramidingAnalysis?.pyramidingSuccessRate || 0)*100).toFixed(1).padStart(8)}% │ ${((response.data.pyramidingAnalysis?.pyramidingSuccessRate || 0)*100).toFixed(1).padStart(8)}% │ ${((response.data.pyramidingAnalysis?.pyramidingSuccessRate || 0)*100).toFixed(1).padStart(8)}% │ ${((response.data.pyramidingAnalysis?.pyramidingSuccessRate || 0)*100).toFixed(1).padStart(8)}% │ ${((response.data.pyramidingAnalysis?.pyramidingSuccessRate || 0)*100).toFixed(1).padStart(8)}% │`);
    console.log(`│ Pyramiding PnL Contribution     │ ${(response.data.pyramidingAnalysis?.pyramidingPnL || 0).toFixed(2).padStart(8)}% │ ${((response.data.pyramidingAnalysis?.pyramidingPnL || 0)/Math.abs(response.data.totalReturnPercentage || 1)*100).toFixed(1).padStart(8)}% │ ${((response.data.pyramidingAnalysis?.pyramidingPnL || 0)/pyramidingEvents).toFixed(2).padStart(8)}% │ ${(response.data.pyramidingAnalysis?.maxPyramidingPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.pyramidingAnalysis?.minPyramidingPnL || 0).toFixed(2).padStart(8)}% │`);
    
    console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
    
    // FIFO Exit Analysis Table
    console.log('\n🚪 FIFO EXIT BEHAVIOR ANALYSIS:');
    console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│ Exit Type                       │ Count    │ % of Total│ Avg PnL │ Max PnL │ Min PnL │');
    console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
    
    const totalExits = response.data.fifoAnalysis?.totalFifoExits || 0;
    const atrBasedExits = response.data.fifoAnalysis?.atrBasedExits || 0;
    const timeBasedExits = response.data.fifoAnalysis?.timeBasedExits || 0;
    const rsiBasedExits = response.data.fifoAnalysis?.rsiBasedExits || 0;
    const emaFlipExits = response.data.fifoAnalysis?.emaFlipExits || 0;
    
    console.log(`│ ATR-Based Exits (ATR Decrease)  │ ${atrBasedExits.toString().padStart(8)} │ ${((atrBasedExits/totalExits)*100).toFixed(1).padStart(8)}% │ ${(response.data.fifoAnalysis?.avgAtrExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.maxAtrExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.minAtrExitPnL || 0).toFixed(2).padStart(8)}% │`);
    console.log(`│ Time-Based Exits                │ ${timeBasedExits.toString().padStart(8)} │ ${((timeBasedExits/totalExits)*100).toFixed(1).padStart(8)}% │ ${(response.data.fifoAnalysis?.avgTimeExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.maxTimeExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.minTimeExitPnL || 0).toFixed(2).padStart(8)}% │`);
    console.log(`│ RSI-Based Exits                 │ ${rsiBasedExits.toString().padStart(8)} │ ${((rsiBasedExits/totalExits)*100).toFixed(1).padStart(8)}% │ ${(response.data.fifoAnalysis?.avgRsiExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.maxRsiExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.minRsiExitPnL || 0).toFixed(2).padStart(8)}% │`);
    console.log(`│ EMA Flip Exits                  │ ${emaFlipExits.toString().padStart(8)} │ ${((emaFlipExits/totalExits)*100).toFixed(1).padStart(8)}% │ ${(response.data.fifoAnalysis?.avgEmaFlipExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.maxEmaFlipExitPnL || 0).toFixed(2).padStart(8)}% │ ${(response.data.fifoAnalysis?.minEmaFlipExitPnL || 0).toFixed(2).padStart(8)}% │`);
    
    console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
    
    // ATR Decrease Analysis
    console.log('\n📉 ATR DECREASE ANALYSIS:');
    console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│ ATR Behavior                    │ Count    │ Avg ATR  │ Max ATR  │ Min ATR  │ PnL Impact│');
    console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
    
    const atrDecreaseEvents = response.data.atrAnalysis?.atrDecreaseEvents || 0;
    const avgAtrDecrease = response.data.atrAnalysis?.avgAtrDecrease || 0;
    const maxAtrDecrease = response.data.atrAnalysis?.maxAtrDecrease || 0;
    const minAtrDecrease = response.data.atrAnalysis?.minAtrDecrease || 0;
    const atrDecreasePnL = response.data.atrAnalysis?.atrDecreasePnL || 0;
    
    console.log(`│ ATR Decrease Events             │ ${atrDecreaseEvents.toString().padStart(8)} │ ${avgAtrDecrease.toFixed(2).padStart(8)} │ ${maxAtrDecrease.toFixed(2).padStart(8)} │ ${minAtrDecrease.toFixed(2).padStart(8)} │ ${atrDecreasePnL.toFixed(2).padStart(8)}% │`);
    console.log(`│ ATR Decrease Exit Triggers      │ ${(response.data.atrAnalysis?.atrDecreaseExitTriggers || 0).toString().padStart(8)} │ ${(response.data.atrAnalysis?.avgAtrDecreaseExitTrigger || 0).toFixed(2).padStart(8)} │ ${(response.data.atrAnalysis?.maxAtrDecreaseExitTrigger || 0).toFixed(2).padStart(8)} │ ${(response.data.atrAnalysis?.minAtrDecreaseExitTrigger || 0).toFixed(2).padStart(8)} │ ${(response.data.atrAnalysis?.atrDecreaseExitPnL || 0).toFixed(2).padStart(8)}% │`);
    
    console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
    
    // Trade Sequence Analysis
    console.log('\n📊 TRADE SEQUENCE ANALYSIS:');
    console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│ Sequence Pattern                │ Count    │ Avg Size │ Max Size │ Min Size │ Success %│');
    console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
    
    const singleTrades = response.data.sequenceAnalysis?.singleTrades || 0;
    const doubleTrades = response.data.sequenceAnalysis?.doubleTrades || 0;
    const tripleTrades = response.data.sequenceAnalysis?.tripleTrades || 0;
    const quadTrades = response.data.sequenceAnalysis?.quadTrades || 0;
    const maxTrades = response.data.sequenceAnalysis?.maxTrades || 0;
    
    console.log(`│ Single Trades (No Pyramiding)   │ ${singleTrades.toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.avgSingleTradeSize || 0).toFixed(2).padStart(8)} │ ${(response.data.sequenceAnalysis?.maxSingleTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.minSingleTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.singleTradeSuccessRate || 0).toFixed(1).padStart(8)}% │`);
    console.log(`│ Double Trades (2 Lots)          │ ${doubleTrades.toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.avgDoubleTradeSize || 0).toFixed(2).padStart(8)} │ ${(response.data.sequenceAnalysis?.maxDoubleTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.minDoubleTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.doubleTradeSuccessRate || 0).toFixed(1).padStart(8)}% │`);
    console.log(`│ Triple Trades (3 Lots)          │ ${tripleTrades.toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.avgTripleTradeSize || 0).toFixed(2).padStart(8)} │ ${(response.data.sequenceAnalysis?.maxTripleTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.minTripleTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.tripleTradeSuccessRate || 0).toFixed(1).padStart(8)}% │`);
    console.log(`│ Quad Trades (4+ Lots)           │ ${quadTrades.toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.avgQuadTradeSize || 0).toFixed(2).padStart(8)} │ ${(response.data.sequenceAnalysis?.maxQuadTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.minQuadTradeSize || 0).toString().padStart(8)} │ ${(response.data.sequenceAnalysis?.quadTradeSuccessRate || 0).toFixed(1).padStart(8)}% │`);
    
    console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
    
    // Key Insights
    console.log('\n💡 KEY INSIGHTS:');
    console.log(`   🔄 Pyramiding Frequency: ${((pyramidingEvents/totalTrades)*100).toFixed(1)}% of trades involve pyramiding`);
    console.log(`   📉 ATR-Based Exits: ${((atrBasedExits/totalExits)*100).toFixed(1)}% of exits triggered by ATR decrease`);
    console.log(`   ⏰ Time-Based Exits: ${((timeBasedExits/totalExits)*100).toFixed(1)}% of exits triggered by time`);
    console.log(`   📊 Average Pyramiding Size: ${avgPyramidingSize.toFixed(2)} lots per pyramiding event`);
    console.log(`   💰 Pyramiding Contribution: ${((response.data.pyramidingAnalysis?.pyramidingPnL || 0)/Math.abs(response.data.totalReturnPercentage || 1)*100).toFixed(1)}% of total PnL`);
    
    console.log('\n🎉 Pyramiding and FIFO analysis completed!');
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Analysis failed:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the analysis
analyzePyramidingFifo().catch(error => {
  console.error('❌ Pyramiding FIFO analysis failed:', error);
});
