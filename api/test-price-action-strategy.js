const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');

async function testPriceActionStrategy() {
  console.log('🚀 Testing Price Action Strategy with Supertrend(10,2) + MACD');
  console.log('='.repeat(60));

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const backtestService = app.get(BacktestOrchestratorService);
    const strategyService = app.get(PriceActionStrategyService);

    // Register the new strategy
    backtestService.registerStrategy('price-action', strategyService);

    const configurations = [
      {
        name: "Price Action Strategy - Supertrend(10,2) + MACD",
        description: "New strategy with Supertrend(10,2) and MACD momentum filter",
        config: {
          strategyName: 'price-action',
          symbol: 'NIFTY',
          timeframe: '1d',
          startDate: '2016-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          initialBalance: 100000,
          strategyConfig: {
            // Supertrend configuration
            supertrendPeriod: 10,
            supertrendMultiplier: 2.0,
            atrPeriod: 14,
            
            // MACD configuration
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            
            // Position management
            positionSize: 8,
            maxLots: 1, // Only one position at a time for this strategy
            exitMode: 'FIFO',
            
            // Risk management
            maxLossPct: 0.10,
            enableCapitalProtection: false,
            enableCircuitBreaker: false,
            maxDrawdown: 1.0,
            
            // Capital management
            maxTradePercent: 0.95,
            dynamicPositionSizing: true,
            basePositionSize: 1,
          }
        }
      }
    ];

    const results = [];

    for (const { name, description, config } of configurations) {
      console.log(`\n📊 Testing: ${name}`);
      console.log(`Description: ${description}`);
      console.log('-'.repeat(50));

      try {
        const result = await backtestService.runBacktest(config);
        
        const totalTrades = result.trades ? result.trades.length : 0;
        const winningTrades = result.trades ? result.trades.filter(t => t.pnl > 0).length : 0;
        const losingTrades = result.trades ? result.trades.filter(t => t.pnl < 0).length : 0;
        const breakEvenTrades = result.trades ? result.trades.filter(t => t.pnl === 0).length : 0;
        
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const breakEvenRate = totalTrades > 0 ? (breakEvenTrades / totalTrades) * 100 : 0;
        
        const totalReturn = result.totalReturn || 0;
        const years = (new Date(config.endDate) - new Date(config.startDate)) / (365.25 * 24 * 60 * 60 * 1000);
        const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn / 100, 1 / years) - 1 : 0;

        console.log(`📈 RESULTS:`);
        console.log(`   Total Trades: ${totalTrades}`);
        console.log(`   Win Rate: ${winRate.toFixed(2)}%`);
        console.log(`   Break-Even Rate: ${breakEvenRate.toFixed(2)}%`);
        console.log(`   Total Return: ${totalReturn.toFixed(2)}%`);
        console.log(`   Annualized Return: ${(annualizedReturn * 100).toFixed(2)}%`);
        console.log(`   Avg Win: ₹${(result.averageWin || 0).toFixed(2)}`);
        console.log(`   Avg Loss: ₹${(result.averageLoss || 0).toFixed(2)}`);
        console.log(`   Max Drawdown: ${((result.maxDrawdown || 0) * 100).toFixed(2)}%`);
        console.log(`   Trades Logged: ${totalTrades}`);

        if (result.trades && result.trades.length > 0) {
          console.log('   🧾 Sample Trades (First 10):');
          result.trades.slice(0, 10).forEach((trade, index) => {
            const entryTime = new Date(trade.entryTime).toISOString().split('T')[0];
            const exitTime = new Date(trade.exitTime).toISOString().split('T')[0];
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
          winRate,
          breakEvenRate,
          totalReturn,
          annualizedReturn: annualizedReturn * 100,
          maxDrawdown: (result.maxDrawdown || 0) * 100,
          averageWin: result.averageWin || 0,
          averageLoss: result.averageLoss || 0,
        });

      } catch (error) {
        console.error(`❌ Error testing ${name}:`, error.message);
      }
    }

    // Summary
    console.log('\n📊 PRICE ACTION STRATEGY ANALYSIS:');
    console.log('='.repeat(50));
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}:`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Annualized Return: ${result.annualizedReturn.toFixed(2)}%`);
      console.log(`   Win Rate: ${result.winRate.toFixed(2)}%`);
      console.log(`   Break-Even Rate: ${result.breakEvenRate.toFixed(2)}%`);
      console.log(`   Max Drawdown: ${result.maxDrawdown.toFixed(2)}%`);
      console.log(`   Trade Count: ${result.totalTrades}`);
      console.log('');
    });

    const bestResult = results.reduce((best, current) => 
      current.annualizedReturn > best.annualizedReturn ? current : best
    );

    console.log('🏆 BEST PRICE ACTION CONFIGURATION:');
    console.log(`   ${bestResult.name}`);
    console.log(`   Description: ${bestResult.description}`);
    console.log(`   Annualized Return: ${bestResult.annualizedReturn.toFixed(2)}%`);
    console.log(`   Win Rate: ${bestResult.winRate.toFixed(2)}%`);
    console.log(`   Break-Even Rate: ${bestResult.breakEvenRate.toFixed(2)}%`);
    console.log(`   Max Drawdown: ${bestResult.maxDrawdown.toFixed(2)}%`);
    console.log(`   Trade Count: ${bestResult.totalTrades}`);

    console.log('\n💡 PRICE ACTION ANALYSIS:');
    if (bestResult.annualizedReturn >= 15) {
      console.log('   ✅ EXCELLENT: Annual return >= 15%');
    } else if (bestResult.annualizedReturn >= 10) {
      console.log('   ✅ GOOD: Annual return >= 10%');
    } else if (bestResult.annualizedReturn >= 5) {
      console.log('   ⚠️ MODERATE: Annual return >= 5%');
    } else {
      console.log('   ❌ POOR: Annual return < 5%');
    }

    if (bestResult.breakEvenRate <= 20) {
      console.log('   ✅ EXCELLENT: Break-even rate <= 20%');
    } else if (bestResult.breakEvenRate <= 30) {
      console.log('   ✅ GOOD: Break-even rate <= 30%');
    } else {
      console.log('   ⚠️ MODERATE: Break-even rate > 30%');
    }

    if (bestResult.winRate >= 50) {
      console.log('   ✅ EXCELLENT: Win rate >= 50%');
    } else if (bestResult.winRate >= 40) {
      console.log('   ✅ GOOD: Win rate >= 40%');
    } else {
      console.log('   ⚠️ MODERATE: Win rate < 40%');
    }

    console.log('\n🎯 TARGET ACHIEVEMENT:');
    if (bestResult.annualizedReturn >= 15) {
      console.log('   ✅ TARGET MET: Achieved 15%+ annual returns');
    } else {
      console.log('   ❌ TARGET NOT MET: Need further optimization for 15%+ returns');
    }

    await app.close();
  } catch (error) {
    console.error('❌ Error running price action strategy test:', error);
  }
}

// Run the test
testPriceActionStrategy().catch(console.error);
