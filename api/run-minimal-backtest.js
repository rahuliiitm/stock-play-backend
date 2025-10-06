const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');

async function runMinimalBacktest() {
  console.log('🚀 Running Minimal Configuration Backtest...\n');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const orchestrator = app.get('BacktestOrchestratorService');
    
    // Minimal configuration to get maximum trades
    const minimalConfig = {
      id: 'minimal-strategy-test',
      name: 'Minimal Strategy Test',
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2015-01-01T00:00:00.000Z',
      endDate: '2015-12-31T23:59:59.000Z', // 1 year test
      initialBalance: 100000,
      strategyConfig: {
        id: 'minimal-strategy-test',
        name: 'Minimal Strategy Test',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrDeclineThreshold: 0.08,
        atrExpansionThreshold: 0.002,
        atrRequiredForEntry: false, // DISABLED for initial entries
        strongCandleThreshold: 0.01,
        gapUpDownThreshold: 0.01,
        rsiPeriod: 14,
        rsiEntryLong: 20, // Very loose RSI entry
        rsiEntryShort: 80, // Very loose RSI entry
        rsiExitLong: 30, // Very loose RSI exit
        rsiExitShort: 70, // Very loose RSI exit
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 20, // High max lots
        pyramidingEnabled: true,
        exitMode: 'LIFO',
        misExitTime: null,
        cncExitTime: null,
        maxConsecutiveLosses: 10, // High tolerance
        maxDrawdownStop: 0.2, // High tolerance
        positionSizingMode: 'CONSERVATIVE'
      }
    };
    
    console.log('⚙️  Minimal Strategy Configuration:');
    console.log(`   🔧 ATR Required for Entry: ${minimalConfig.strategyConfig.atrRequiredForEntry}`);
    console.log(`   📊 RSI Entry Long: ${minimalConfig.strategyConfig.rsiEntryLong}`);
    console.log(`   📊 RSI Entry Short: ${minimalConfig.strategyConfig.rsiEntryShort}`);
    console.log(`   📊 RSI Exit Long: ${minimalConfig.strategyConfig.rsiExitLong}`);
    console.log(`   📊 RSI Exit Short: ${minimalConfig.strategyConfig.rsiExitShort}`);
    console.log(`   📊 Max Lots: ${minimalConfig.strategyConfig.maxLots}`);
    console.log(`   📊 Max Consecutive Losses: ${minimalConfig.strategyConfig.maxConsecutiveLosses}`);
    console.log(`   📊 Max Drawdown Stop: ${minimalConfig.strategyConfig.maxDrawdownStop}`);
    console.log(`   📈 EMA Fast: ${minimalConfig.strategyConfig.emaFastPeriod}`);
    console.log(`   📈 EMA Slow: ${minimalConfig.strategyConfig.emaSlowPeriod}\n`);
    
    console.log('🎯 Key Changes for Maximum Trades:');
    console.log('   ✅ ATR requirement DISABLED for initial entries');
    console.log('   ✅ Very loose RSI entry criteria (20/80)');
    console.log('   ✅ Very loose RSI exit criteria (30/70)');
    console.log('   ✅ High max lots (20)');
    console.log('   ✅ High consecutive loss tolerance (10)');
    console.log('   ✅ High drawdown tolerance (20%)');
    console.log('   ✅ EMA (9, 21) for positional strategy\n');
    
    console.log('📤 Running minimal backtest...');
    const results = await orchestrator.runBacktest(minimalConfig);
    
    console.log('\n================================================================================');
    console.log('🎯 MINIMAL STRATEGY BACKTEST RESULTS');
    console.log('================================================================================');
    
    console.log('\n💰 PERFORMANCE METRICS:');
    console.log(`   📈 Total Trades: ${results.totalTrades}`);
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}`);
    
    console.log('\n📊 TRADE BREAKDOWN:');
    console.log(`   🟢 Winning Trades: ${results.winningTrades}`);
    console.log(`   🔴 Losing Trades: ${results.losingTrades}`);
    console.log(`   📊 Average Win: ₹${results.averageWin.toFixed(2)}`);
    console.log(`   📊 Average Loss: ₹${results.averageLoss.toFixed(2)}`);
    console.log(`   📊 Total P&L: ₹${results.totalReturn.toFixed(2)}`);
    
    console.log('\n🎯 RISK/REWARD ANALYSIS:');
    const lossRatio = results.averageLoss !== 0 ? Math.abs(results.averageWin / results.averageLoss) : 0;
    const riskReward = results.averageLoss !== 0 ? Math.abs(results.averageWin / results.averageLoss) : 0;
    console.log(`   📊 Loss Ratio: ${lossRatio.toFixed(2)}x (target: <1.5x)`);
    console.log(`   📊 Risk/Reward Ratio: ${riskReward.toFixed(2)}x (target: >0.67x)`);
    
    console.log('\n📉 DRAWDOWN ANALYSIS:');
    console.log(`   📊 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   📊 Peak Equity: ₹${results.peakEquity.toFixed(2)}`);
    console.log(`   📊 Trough Equity: ₹${results.troughEquity.toFixed(2)}`);
    
    console.log('\n⏱️ DURATION ANALYSIS:');
    console.log(`   📅 Start Date: ${new Date(results.startDate).toISOString().split('T')[0]}`);
    console.log(`   📅 End Date: ${new Date(results.endDate).toISOString().split('T')[0]}`);
    console.log(`   📅 Duration: ${results.duration} days`);
    
    console.log('\n🎯 CONCLUSION:');
    if (results.totalTrades > 50) {
      console.log('   ✅ SUCCESS: High trade frequency achieved!');
    } else if (results.totalTrades > 20) {
      console.log('   ⚠️  PARTIAL: Moderate trade frequency');
    } else {
      console.log('   ❌ ISSUE: Low trade frequency - need further investigation');
    }
    
    if (results.winRate > 0.5) {
      console.log('   ✅ Good win rate achieved');
    } else {
      console.log('   ⚠️  Low win rate - may need strategy refinement');
    }
    
    console.log('\n🎉 Minimal strategy backtest completed!');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

runMinimalBacktest().catch(console.error);


