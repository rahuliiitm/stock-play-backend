const { BacktestOrchestratorService } = require('./dist/src/modules/backtest/services/backtest-orchestrator.service');
const { CsvDataProvider } = require('./dist/src/modules/data/providers/csv-data-provider');
const { MockOrderExecutionProvider } = require('./dist/src/modules/order-execution/providers/mock-order-execution.provider');

async function analyzeLossCauses() {
  console.log('🔍 ANALYZING ROOT CAUSES OF LOSSES...\n');

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
      id: 'loss-analysis',
      name: 'Loss Analysis Strategy',
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
    console.log('📊 Running backtest for loss analysis...\n');
    const results = await backtestOrchestrator.runBacktest(optimizedConfig);

    console.log('================================================================================');
    console.log('🔍 ROOT CAUSE ANALYSIS OF LOSSES');
    console.log('================================================================================\n');

    // Basic metrics
    console.log('📈 BASIC PERFORMANCE:');
    console.log(`   💰 Total Return: ₹${results.totalReturn.toFixed(2)} (${results.totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   📊 Total Trades: ${results.totalTrades}`);
    console.log(`   🎯 Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`   📊 Profit Factor: ${results.profitFactor.toFixed(2)}\n`);

    // Trade analysis
    const trades = results.trades || [];
    if (trades.length > 0) {
      console.log('📊 TRADE BREAKDOWN:');
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      
      console.log(`   🟢 Winning Trades: ${winningTrades.length} (${((winningTrades.length/trades.length)*100).toFixed(1)}%)`);
      console.log(`   🔴 Losing Trades: ${losingTrades.length} (${((losingTrades.length/trades.length)*100).toFixed(1)}%)`);
      console.log(`   💚 Average Win: ₹${results.averageWin.toFixed(2)}`);
      console.log(`   💔 Average Loss: ₹${results.averageLoss.toFixed(2)}`);
      console.log(`   📊 Risk/Reward Ratio: ${(results.averageWin / Math.abs(results.averageLoss)).toFixed(2)}x\n`);

      // 1. PYRAMIDING IMPACT ANALYSIS
      console.log('🔍 1. PYRAMIDING IMPACT ANALYSIS:');
      
      // Analyze trade sequences to identify pyramiding patterns
      const tradeSequences = [];
      let currentSequence = [];
      let lastDirection = null;
      
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i];
        const currentDirection = trade.direction;
        
        if (lastDirection === null || lastDirection === currentDirection) {
          // Same direction or first trade - continue sequence
          currentSequence.push(trade);
        } else {
          // Direction changed - save previous sequence and start new one
          if (currentSequence.length > 0) {
            tradeSequences.push([...currentSequence]);
          }
          currentSequence = [trade];
        }
        lastDirection = currentDirection;
      }
      
      if (currentSequence.length > 0) {
        tradeSequences.push(currentSequence);
      }
      
      // Analyze pyramiding sequences (sequences with multiple trades)
      const pyramidingSequences = tradeSequences.filter(seq => seq.length > 1);
      const singleTradeSequences = tradeSequences.filter(seq => seq.length === 1);
      
      console.log(`   📊 Total Trade Sequences: ${tradeSequences.length}`);
      console.log(`   📊 Pyramiding Sequences: ${pyramidingSequences.length}`);
      console.log(`   📊 Single Trade Sequences: ${singleTradeSequences.length}`);
      
      if (pyramidingSequences.length > 0) {
        const pyramidingPnl = pyramidingSequences.reduce((sum, seq) => 
          sum + seq.reduce((seqSum, trade) => seqSum + trade.pnl, 0), 0);
        const singlePnl = singleTradeSequences.reduce((sum, seq) => 
          sum + seq.reduce((seqSum, trade) => seqSum + trade.pnl, 0), 0);
        
        console.log(`   📊 Pyramiding P&L: ₹${pyramidingPnl.toFixed(2)}`);
        console.log(`   📊 Single Trade P&L: ₹${singlePnl.toFixed(2)}`);
        console.log(`   📊 Pyramiding Impact: ${pyramidingPnl < 0 ? '❌ NEGATIVE' : '✅ POSITIVE'}`);
        
        // Analyze FIFO exit impact
        const fifoImpact = pyramidingSequences.map(seq => {
          const firstTrade = seq[0];
          const lastTrade = seq[seq.length - 1];
          return {
            sequence: seq,
            firstPnl: firstTrade.pnl,
            lastPnl: lastTrade.pnl,
            totalPnl: seq.reduce((sum, trade) => sum + trade.pnl, 0),
            fifoEffect: firstTrade.pnl > lastTrade.pnl ? 'First exits better' : 'Last exits worse'
          };
        });
        
        const badFifoSequences = fifoImpact.filter(impact => impact.totalPnl < 0 && impact.firstPnl > impact.lastPnl);
        console.log(`   📊 Bad FIFO Sequences: ${badFifoSequences.length}/${pyramidingSequences.length}`);
        console.log(`   📊 FIFO Impact: ${badFifoSequences.length > pyramidingSequences.length * 0.5 ? '❌ NEGATIVE' : '✅ NEUTRAL'}\n`);
      }

      // 2. ENTRY TIMING ANALYSIS
      console.log('🔍 2. ENTRY TIMING ANALYSIS:');
      
      // Analyze RSI at entry points
      const rsiAtEntry = trades.map(trade => ({
        trade,
        rsi: trade.rsi || 'N/A', // RSI might not be stored in trade object
        pnl: trade.pnl
      }));
      
      // Group by RSI ranges
      const rsiRanges = {
        '0-20': trades.filter(t => t.rsi >= 0 && t.rsi <= 20),
        '20-40': trades.filter(t => t.rsi > 20 && t.rsi <= 40),
        '40-60': trades.filter(t => t.rsi > 40 && t.rsi <= 60),
        '60-80': trades.filter(t => t.rsi > 60 && t.rsi <= 80),
        '80-100': trades.filter(t => t.rsi > 80 && t.rsi <= 100)
      };
      
      console.log('   📊 RSI Entry Analysis:');
      Object.entries(rsiRanges).forEach(([range, trades]) => {
        if (trades.length > 0) {
          const avgPnl = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length;
          const winRate = (trades.filter(t => t.pnl > 0).length / trades.length) * 100;
          console.log(`      RSI ${range}: ${trades.length} trades, Avg P&L: ₹${avgPnl.toFixed(2)}, Win Rate: ${winRate.toFixed(1)}%`);
        }
      });
      
      // Analyze trade duration
      const shortTrades = trades.filter(t => t.duration < 3600000); // < 1 hour
      const mediumTrades = trades.filter(t => t.duration >= 3600000 && t.duration < 14400000); // 1-4 hours
      const longTrades = trades.filter(t => t.duration >= 14400000); // > 4 hours
      
      console.log('\n   📊 Trade Duration Analysis:');
      console.log(`      Short Trades (<1h): ${shortTrades.length}, Avg P&L: ₹${(shortTrades.reduce((sum, t) => sum + t.pnl, 0) / shortTrades.length || 0).toFixed(2)}`);
      console.log(`      Medium Trades (1-4h): ${mediumTrades.length}, Avg P&L: ₹${(mediumTrades.reduce((sum, t) => sum + t.pnl, 0) / mediumTrades.length || 0).toFixed(2)}`);
      console.log(`      Long Trades (>4h): ${longTrades.length}, Avg P&L: ₹${(longTrades.reduce((sum, t) => sum + t.pnl, 0) / longTrades.length || 0).toFixed(2)}\n`);

      // 3. FALSE POSITIVE ANALYSIS
      console.log('🔍 3. FALSE POSITIVE ANALYSIS:');
      
      // Analyze consecutive losses
      let consecutiveLosses = 0;
      let maxConsecutiveLosses = 0;
      let currentConsecutiveLosses = 0;
      
      for (const trade of trades) {
        if (trade.pnl < 0) {
          currentConsecutiveLosses++;
          consecutiveLosses++;
        } else {
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
          currentConsecutiveLosses = 0;
        }
      }
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
      
      console.log(`   📊 Consecutive Losses: ${consecutiveLosses}`);
      console.log(`   📊 Max Consecutive Losses: ${maxConsecutiveLosses}`);
      console.log(`   📊 Loss Streak Impact: ${maxConsecutiveLosses > 5 ? '❌ HIGH' : '✅ MODERATE'}`);
      
      // Analyze large losses
      const largeLosses = trades.filter(t => t.pnl < -200);
      const veryLargeLosses = trades.filter(t => t.pnl < -500);
      
      console.log(`   📊 Large Losses (>₹200): ${largeLosses.length}`);
      console.log(`   📊 Very Large Losses (>₹500): ${veryLargeLosses.length}`);
      
      if (veryLargeLosses.length > 0) {
        console.log('   📊 Very Large Losses Details:');
        veryLargeLosses.forEach((trade, i) => {
          console.log(`      ${i+1}. ${trade.direction} ${trade.symbol}: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`);
        });
      }
      
      // 4. PARAMETER SENSITIVITY ANALYSIS
      console.log('\n🔍 4. PARAMETER SENSITIVITY ANALYSIS:');
      
      // Current parameters
      console.log('   📊 Current Parameters:');
      console.log(`      RSI Entry Long: ${optimizedConfig.strategyConfig.rsiEntryLong}`);
      console.log(`      RSI Entry Short: ${optimizedConfig.strategyConfig.rsiEntryShort}`);
      console.log(`      RSI Exit Long: ${optimizedConfig.strategyConfig.rsiExitLong}`);
      console.log(`      RSI Exit Short: ${optimizedConfig.strategyConfig.rsiExitShort}`);
      console.log(`      ATR Decline Threshold: ${optimizedConfig.strategyConfig.atrDeclineThreshold}`);
      console.log(`      ATR Expansion Threshold: ${optimizedConfig.strategyConfig.atrExpansionThreshold}`);
      console.log(`      Max Lots: ${optimizedConfig.strategyConfig.maxLots}`);
      
      // Recommendations
      console.log('\n🎯 RECOMMENDATIONS:');
      
      if (pyramidingSequences.length > 0 && badFifoSequences.length > pyramidingSequences.length * 0.5) {
        console.log('   🔧 FIFO EXIT ISSUE: Consider LIFO exits or reduce pyramiding');
      }
      
      if (maxConsecutiveLosses > 5) {
        console.log('   🔧 LOSS STREAKS: Add position sizing rules or stop trading after X consecutive losses');
      }
      
      if (veryLargeLosses.length > 0) {
        console.log('   🔧 LARGE LOSSES: Tighten stop-loss or reduce position size');
      }
      
      if (results.winRate < 0.5) {
        console.log('   🔧 LOW WIN RATE: Tighten entry criteria or improve exit timing');
      }
      
      if (results.profitFactor < 1) {
        console.log('   🔧 NEGATIVE PROFIT FACTOR: Focus on improving risk/reward ratio');
      }

    } else {
      console.log('❌ No trades found for analysis');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

analyzeLossCauses().catch(console.error);

