const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { Logger } = require('@nestjs/common');

async function runPriceActionDailyBacktest() {
  const logger = new Logger('PriceActionDailyBacktest');
  logger.log('🚀 Starting comprehensive backtest for Price Action Strategy on Daily Timeframe...');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'debug', 'log'] });
  const backtestOrchestrator = app.get(BacktestOrchestratorService);

  // Calculate date range for last 8-9 years
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 9); // 9 years ago to ensure we have 8+ years of data

  const config = {
    symbol: 'NIFTY',
    timeframe: '1d', // Daily timeframe
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    initialCapital: 100000,
    strategyName: 'price-action',
    strategyConfig: {
      supertrendPeriod: 10,
      atrPeriod: 2,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      maxLots: 1,
      positionSize: 1,
    },
  };

  logger.log(`📊 Strategy: ${config.strategyName}`);
  logger.log(`📅 Period: ${config.startDate} to ${config.endDate}`);
  logger.log(`⏰ Timeframe: ${config.timeframe}`);
  logger.log(`💰 Initial Capital: ₹${config.initialCapital}`);

  try {
    const result = await backtestOrchestrator.runBacktest(config);
    
    logger.log('\n✅ Backtest completed successfully!');
    logger.log('📊 BACKTEST RESULTS');
    logger.log('======================================================================');
    
    logger.log('\n💰 Performance Metrics:');
    logger.log(`   Initial Capital: ₹${result.initialCapital}`);
    logger.log(`   Final Capital: ₹${result.finalCapital}`);
    logger.log(`   Total Return: ₹${result.totalReturn.toFixed(2)} (${result.totalReturnPct.toFixed(2)}%)`);
    logger.log(`   Annualized Return: ${result.annualizedReturnPct.toFixed(2)}%`);
    logger.log(`   Max Drawdown: ${result.maxDrawdownPct.toFixed(2)}%`);

    logger.log('\n📈 Trade Statistics:');
    logger.log(`   Total Trades: ${result.totalTrades}`);
    logger.log(`   Winning Trades: ${result.winningTrades} (${result.winRate.toFixed(2)}%)`);
    logger.log(`   Losing Trades: ${result.losingTrades} (${(100 - result.winRate).toFixed(2)}%)`);
    logger.log(`   Average Win: ₹${result.averageWin.toFixed(2)}`);
    logger.log(`   Average Loss: ₹${result.averageLoss.toFixed(2)}`);
    logger.log(`   Profit Factor: ${result.profitFactor.toFixed(2)}`);
    logger.log(`   Average Trade Duration: ${result.averageTradeDuration.toFixed(1)} days`);

    logger.log('\n📅 Backtest Period:');
    logger.log(`   Start Date: ${config.startDate}`);
    logger.log(`   End Date: ${config.endDate}`);
    logger.log(`   Duration: ${result.durationYears.toFixed(1)} years`);
    logger.log(`   Warm-up Period: ${result.warmupPeriod} candles (${(result.warmupPeriod / 365).toFixed(1)} years)`);

    logger.log('\n🎯 Performance Summary:');
    if (result.totalReturnPct > 0) {
      logger.log(`   🎉 Profitable Strategy: ${result.totalReturnPct.toFixed(2)}% total return`);
    } else {
      logger.log(`   ❌ Loss-making Strategy: ${result.totalReturnPct.toFixed(2)}% total return`);
    }
    logger.log(`   ${result.annualizedReturnPct > 0 ? '📈' : '📉'} Annualized Return: ${result.annualizedReturnPct.toFixed(2)}%`);
    logger.log(`   ${result.winRate > 50 ? '✅' : '📉'} Win Rate: ${result.winRate.toFixed(2)}%`);

    // Additional analysis
    logger.log('\n📊 Strategy Analysis:');
    if (result.totalTrades > 0) {
      const avgReturnPerTrade = result.totalReturnPct / result.totalTrades;
      logger.log(`   Average Return per Trade: ${avgReturnPerTrade.toFixed(2)}%`);
      
      if (result.annualizedReturnPct > 10) {
        logger.log(`   🚀 High Performance: Annualized return > 10%`);
      } else if (result.annualizedReturnPct > 5) {
        logger.log(`   📈 Good Performance: Annualized return > 5%`);
      } else if (result.annualizedReturnPct > 0) {
        logger.log(`   📊 Moderate Performance: Positive but low returns`);
      } else {
        logger.log(`   📉 Poor Performance: Negative returns`);
      }
    } else {
      logger.log(`   ⚠️  No trades executed - strategy may be too restrictive`);
    }

  } catch (error) {
    logger.error('❌ Error during backtest:', error);
    logger.error('Stack trace:', error.stack);
  } finally {
    await app.close();
  }
}

runPriceActionDailyBacktest().catch(console.error);
