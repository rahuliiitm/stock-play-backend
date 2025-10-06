const axios = require('axios');

/**
 * Systematic parameter optimization for ATR thresholds
 */
async function optimizeATRThresholds() {
  console.log('🔧 Starting ATR threshold optimization...');
  
  const baseUrl = 'http://localhost:20001';
  
  // Test different ATR threshold combinations
  const thresholdCombinations = [
    // Very permissive thresholds
    { atrDecline: 0.01, atrExpansion: 0.01, name: 'Very Permissive (1%)' },
    { atrDecline: 0.02, atrExpansion: 0.02, name: 'Permissive (2%)' },
    { atrDecline: 0.05, atrExpansion: 0.05, name: 'Moderate (5%)' },
    { atrDecline: 0.1, atrExpansion: 0.1, name: 'Standard (10%)' },
    { atrDecline: 0.15, atrExpansion: 0.15, name: 'Conservative (15%)' },
    { atrDecline: 0.2, atrExpansion: 0.2, name: 'Very Conservative (20%)' },
    
    // Asymmetric thresholds
    { atrDecline: 0.05, atrExpansion: 0.1, name: 'Quick Exit, Slow Entry (5%/10%)' },
    { atrDecline: 0.1, atrExpansion: 0.05, name: 'Slow Exit, Quick Entry (10%/5%)' },
    { atrDecline: 0.02, atrExpansion: 0.1, name: 'Very Quick Exit (2%/10%)' },
    { atrDecline: 0.1, atrExpansion: 0.02, name: 'Very Quick Entry (10%/2%)' },
    
    // Extreme thresholds
    { atrDecline: 0.005, atrExpansion: 0.005, name: 'Ultra Permissive (0.5%)' },
    { atrDecline: 0.3, atrExpansion: 0.3, name: 'Ultra Conservative (30%)' }
  ];
  
  const results = [];
  
  for (const combo of thresholdCombinations) {
    console.log(`\n🧪 Testing: ${combo.name}`);
    console.log(`   📊 ATR Decline: ${combo.atrDecline * 100}%`);
    console.log(`   📊 ATR Expansion: ${combo.atrExpansion * 100}%`);
    
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-06-30T23:59:59.000Z'),
      initialBalance: 100000,
      strategyConfig: {
        id: `atr-optimization-${combo.atrDecline}-${combo.atrExpansion}`,
        name: `ATR Optimization ${combo.name}`,
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        
        // ATR thresholds being tested
        atrDeclineThreshold: combo.atrDecline,
        atrExpansionThreshold: combo.atrExpansion,
        
        strongCandleThreshold: 0.01,
        gapUpDownThreshold: 0.01,
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 45,
        rsiExitShort: 55,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15'
      }
    };
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${baseUrl}/backtest/run`, config, {
        timeout: 60000 // 1 minute timeout
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      const result = {
        name: combo.name,
        atrDecline: combo.atrDecline,
        atrExpansion: combo.atrExpansion,
        totalTrades: response.data.totalTrades || 0,
        totalReturn: response.data.totalReturnPercentage || 0,
        finalBalance: response.data.finalBalance || 0,
        winRate: response.data.winRate || 0,
        maxDrawdown: response.data.maxDrawdown || 0,
        sharpeRatio: response.data.sharpeRatio || 0,
        duration: duration,
        success: true
      };
      
      results.push(result);
      
      console.log(`   ✅ Results: ${result.totalTrades} trades, ${result.totalReturn}% return, ${result.winRate}% win rate`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        name: combo.name,
        atrDecline: combo.atrDecline,
        atrExpansion: combo.atrExpansion,
        totalTrades: 0,
        totalReturn: 0,
        finalBalance: 0,
        winRate: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        duration: 0,
        success: false,
        error: error.message
      });
    }
  }
  
  // Analyze results
  console.log('\n' + '='.repeat(100));
  console.log('📊 ATR THRESHOLD OPTIMIZATION RESULTS');
  console.log('='.repeat(100));
  
  console.log('\n📈 RESULTS SUMMARY:');
  console.log('┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Configuration                   │ Trades   │ Return   │ Win Rate │ Drawdown │ Sharpe   │ Duration│');
  console.log('├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
  
  results.forEach(result => {
    const name = result.name.padEnd(31);
    const trades = String(result.totalTrades).padEnd(8);
    const returnPct = String(result.totalReturn.toFixed(1) + '%').padEnd(8);
    const winRate = String(result.winRate.toFixed(1) + '%').padEnd(8);
    const drawdown = String(result.maxDrawdown.toFixed(1) + '%').padEnd(8);
    const sharpe = String(result.sharpeRatio.toFixed(2)).padEnd(8);
    const duration = String(result.duration.toFixed(1) + 's').padEnd(8);
    
    console.log(`│ ${name} │ ${trades} │ ${returnPct} │ ${winRate} │ ${drawdown} │ ${sharpe} │ ${duration} │`);
  });
  
  console.log('└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
  
  // Find best configurations
  const successfulResults = results.filter(r => r.success && r.totalTrades > 0);
  
  if (successfulResults.length > 0) {
    console.log('\n🏆 BEST CONFIGURATIONS:');
    
    // Best by total trades
    const mostTrades = successfulResults.reduce((prev, current) => 
      prev.totalTrades > current.totalTrades ? prev : current
    );
    console.log(`   📊 Most Trades: ${mostTrades.name} (${mostTrades.totalTrades} trades)`);
    
    // Best by return
    const bestReturn = successfulResults.reduce((prev, current) => 
      prev.totalReturn > current.totalReturn ? prev : current
    );
    console.log(`   📈 Best Return: ${bestReturn.name} (${bestReturn.totalReturn.toFixed(2)}%)`);
    
    // Best by win rate
    const bestWinRate = successfulResults.reduce((prev, current) => 
      prev.winRate > current.winRate ? prev : current
    );
    console.log(`   🎯 Best Win Rate: ${bestWinRate.name} (${bestWinRate.winRate.toFixed(2)}%)`);
    
    // Best by Sharpe ratio
    const bestSharpe = successfulResults.reduce((prev, current) => 
      prev.sharpeRatio > current.sharpeRatio ? prev : current
    );
    console.log(`   📊 Best Sharpe: ${bestSharpe.name} (${bestSharpe.sharpeRatio.toFixed(2)})`);
    
    // Balanced performance
    const balanced = successfulResults.filter(r => 
      r.totalTrades >= 10 && 
      r.winRate >= 40 && 
      r.totalReturn > 0
    );
    
    if (balanced.length > 0) {
      console.log('\n⚖️  BALANCED PERFORMANCE (10+ trades, 40%+ win rate, positive return):');
      balanced.forEach(result => {
        console.log(`   📊 ${result.name}: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return, ${result.winRate.toFixed(2)}% win rate`);
      });
    }
    
  } else {
    console.log('\n❌ NO SUCCESSFUL CONFIGURATIONS FOUND');
    console.log('   All threshold combinations failed to generate trades');
    console.log('   Consider:');
    console.log('   - Lowering ATR thresholds further');
    console.log('   - Adjusting RSI parameters');
    console.log('   - Modifying EMA periods');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (successfulResults.length > 0) {
    const recommended = successfulResults.filter(r => 
      r.totalTrades >= 5 && 
      r.winRate >= 30 && 
      r.totalReturn > 0
    );
    
    if (recommended.length > 0) {
      console.log('   🎯 Recommended configurations:');
      recommended.forEach(result => {
        console.log(`   📊 ${result.name}: ATR Decline ${result.atrDecline * 100}%, Expansion ${result.atrExpansion * 100}%`);
      });
    } else {
      console.log('   ⚠️  No configurations meet recommended criteria');
      console.log('   Consider further parameter adjustment');
    }
  } else {
    console.log('   🔧 All configurations need adjustment');
    console.log('   Try even more permissive thresholds');
  }
  
  console.log('\n🎉 ATR threshold optimization completed!');
  
  return results;
}

// Run the optimization
optimizeATRThresholds().catch(error => {
  console.error('❌ ATR threshold optimization failed:', error);
});

