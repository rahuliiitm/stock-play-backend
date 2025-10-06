const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { StrategyFactory } = require('./dist/src/modules/strategy/factories/strategy-factory.service');
const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');

async function testBacktestWithWarmup() {
  console.log('🔧 Testing Backtest with Generic Warm-up Calculator');
  console.log('='.repeat(60));

  try {
    // Create strategy factory and register price action strategy
    const strategyFactory = new StrategyFactory(
      null, // emaGapAtrStrategy - not needed for this test
      new PriceActionStrategyService()
    );

    // Create backtest orchestrator (we'll need to mock the dependencies)
    const mockDataProvider = {
      getHistoricalCandles: async (symbol, timeframe, startDate, endDate) => {
        console.log(`📊 Mock data provider called: ${symbol}, ${timeframe}, ${startDate}, ${endDate}`);
        
        // Return mock data for testing
        const mockCandles = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Generate weekly candles from 2020 to 2024
        let current = new Date(start);
        let price = 10000;
        
        while (current <= end) {
          mockCandles.push({
            symbol: symbol,
            timestamp: current.getTime(),
            open: price,
            high: price + Math.random() * 100,
            low: price - Math.random() * 100,
            close: price + (Math.random() - 0.5) * 200,
            volume: 1000000,
            timeframe: timeframe
          });
          
          price += (Math.random() - 0.5) * 500; // Random walk
          current.setDate(current.getDate() + 7); // Weekly
        }
        
        console.log(`📈 Generated ${mockCandles.length} mock candles`);
        return mockCandles;
      }
    };

    const mockOrderExecution = {
      placeBuyOrder: async (order) => {
        console.log(`📈 Mock BUY order: ${order.symbol} @ ₹${order.price} x ${order.quantity}`);
        return { success: true, orderId: `buy_${Date.now()}` };
      },
      placeSellOrder: async (order) => {
        console.log(`📉 Mock SELL order: ${order.symbol} @ ₹${order.price} x ${order.quantity}`);
        return { success: true, orderId: `sell_${Date.now()}` };
      }
    };

    // Create backtest orchestrator with mocked dependencies
    const orchestrator = new BacktestOrchestratorService(
      strategyFactory,
      mockDataProvider,
      mockOrderExecution,
      null, // validationService
      null, // backtestRunRepository
      null, // backtestResultRepository
      null, // backtestTradeRepository
      null  // eventEmitter
    );

    // Test configuration
    const backtestConfig = {
      id: 'test-backtest',
      name: 'Price Action Strategy Test',
      symbol: 'NIFTY',
      timeframe: '1w',
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      strategyName: 'price-action',
      strategyConfig: {
        id: 'price-action-test',
        name: 'Price Action Strategy',
        symbol: 'NIFTY',
        timeframe: '1w',
        supertrendPeriod: 10,
        supertrendMultiplier: 2.0,
        atrPeriod: 14,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
      }
    };

    console.log('\n🚀 Starting backtest with warm-up period...');
    console.log(`📊 Strategy: ${backtestConfig.strategyName}`);
    console.log(`📅 Period: ${backtestConfig.startDate} to ${backtestConfig.endDate}`);
    console.log(`💰 Initial Capital: ₹${backtestConfig.initialCapital.toLocaleString()}`);

    // Run the backtest
    const result = await orchestrator.runBacktest(backtestConfig);

    console.log('\n📊 Backtest Results:');
    console.log(`   Total Return: ${result.totalReturnPercentage.toFixed(2)}%`);
    console.log(`   Annualized Return: ${result.annualizedReturnPercentage.toFixed(2)}%`);
    console.log(`   Max Drawdown: ${result.maxDrawdownPercentage.toFixed(2)}%`);
    console.log(`   Total Trades: ${result.totalTrades}`);
    console.log(`   Win Rate: ${result.winRate.toFixed(2)}%`);
    console.log(`   Profit Factor: ${result.profitFactor.toFixed(2)}`);

    if (result.trades && result.trades.length > 0) {
      console.log('\n📈 Sample Trades:');
      result.trades.slice(0, 5).forEach((trade, i) => {
        console.log(`   ${i + 1}. ${trade.direction} ${trade.symbol} @ ₹${trade.entryPrice} → ₹${trade.exitPrice} | P&L: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing backtest with warm-up:', error);
    console.error('Stack trace:', error.stack);
  }
}

testBacktestWithWarmup().catch(console.error);
