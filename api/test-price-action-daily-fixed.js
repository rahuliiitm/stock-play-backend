const fs = require('fs');
const path = require('path');

/**
 * Fixed Price Action Strategy Daily Backtest
 * 
 * This test properly maintains position state across evaluations
 * and uses the existing data provider with mocked broker interactions.
 */

// Import the compiled strategy service
const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');

// Mock the StrategyIndicatorsService with realistic calculations
class MockStrategyIndicatorsService {
  calculateSupertrend(candles, period, multiplier) {
    if (candles.length < period + 10) return null;
    
    // Simple ATR calculation
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // Calculate ATR (simplified)
    let atr = 0;
    for (let i = 1; i < Math.min(period, candles.length); i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i-1]),
        Math.abs(lows[i] - closes[i-1])
      );
      atr += tr;
    }
    atr = atr / Math.min(period, candles.length - 1);
    
    const latestCandle = candles[candles.length - 1];
    const basicUpperBand = (highs.slice(-period).reduce((a, b) => a + b, 0) / period) + (multiplier * atr);
    const basicLowerBand = (lows.slice(-period).reduce((a, b) => a + b, 0) / period) - (multiplier * atr);
    
    const supertrend = latestCandle.close > basicUpperBand ? basicLowerBand : basicUpperBand;
    const isBullish = latestCandle.close > supertrend;
    
    return {
      supertrend: supertrend,
      isBullish,
      isBearish: !isBullish,
      trendDirection: isBullish ? 'UPTREND' : 'DOWNTREND'
    };
  }

  calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod) {
    if (candles.length < slowPeriod + signalPeriod) return null;
    
    const closes = candles.map(c => c.close);
    
    // Simple EMA calculation
    function calculateEMA(values, period) {
      const multiplier = 2 / (period + 1);
      let ema = values[0];
      for (let i = 1; i < values.length; i++) {
        ema = (values[i] * multiplier) + (ema * (1 - multiplier));
      }
      return ema;
    }
    
    const fastEMA = calculateEMA(closes.slice(-fastPeriod), fastPeriod);
    const slowEMA = calculateEMA(closes.slice(-slowPeriod), slowPeriod);
    const macd = fastEMA - slowEMA;
    
    // Simple signal line (EMA of MACD)
    const signal = macd * 0.9; // Simplified signal calculation
    const isBullish = macd > signal;
    
    return {
      macd: macd,
      signal: signal,
      isBullish,
      isBearish: !isBullish
    };
  }
}

async function runPriceActionDailyBacktest() {
  console.log('🚀 Price Action Strategy - Daily Backtest (8-9 Years) - FIXED VERSION');
  console.log('='.repeat(80));

  try {
    // Create strategy instance with mock indicators service
    const mockIndicatorsService = new MockStrategyIndicatorsService();
    const strategy = new PriceActionStrategyService(mockIndicatorsService);

    // Strategy configuration
    const config = {
      id: 'price-action-daily-fixed',
      name: 'Price Action Strategy with Supertrend(10,2) and MACD',
      symbol: 'NIFTY',
      timeframe: '1d',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
      atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    };

    console.log('\n📊 Strategy Configuration:');
    console.log(`   Strategy: ${config.name}`);
    console.log(`   Symbol: ${config.symbol}`);
    console.log(`   Timeframe: ${config.timeframe}`);
    console.log(`   Supertrend: ${config.supertrendPeriod} periods, ${config.supertrendMultiplier}x multiplier`);
    console.log(`   ATR: ${config.atrPeriod} periods`);
    console.log(`   MACD: ${config.macdFast}/${config.macdSlow}/${config.macdSignal}`);

    // Load NIFTY daily data
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvFile = path.join(dataDir, 'NIFTY_10year_1d.csv');
    
    if (!fs.existsSync(csvFile)) {
      console.error(`❌ Data file not found: ${csvFile}`);
      console.log('Available files:');
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
      files.forEach(f => console.log(`   - ${f}`));
      return;
    }

    console.log(`\n📈 Loading data from: ${csvFile}`);
    
    const csvData = fs.readFileSync(csvFile, 'utf8');
    const lines = csvData.trim().split('\n');
    const candles = [];

    // Parse CSV data
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 6) {
        candles.push({
          symbol: 'NIFTY',
          timestamp: new Date(values[0]).getTime(),
          open: parseFloat(values[1]),
          high: parseFloat(values[2]),
          low: parseFloat(values[3]),
          close: parseFloat(values[4]),
          volume: parseFloat(values[5]) || 0,
          timeframe: '1d'
        });
      }
    }

    console.log(`   Loaded ${candles.length} candles`);
    console.log(`   Date range: ${new Date(candles[0].timestamp).toISOString().split('T')[0]} to ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Calculate date range for last 8-9 years
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 9);
    
    // Filter candles for the last 8-9 years
    const filteredCandles = candles.filter(candle => {
      const candleDate = new Date(candle.timestamp);
      return candleDate >= startDate && candleDate <= endDate;
    });

    console.log(`\n📅 Filtered for last 8-9 years: ${filteredCandles.length} candles`);
    console.log(`   From: ${new Date(filteredCandles[0].timestamp).toISOString().split('T')[0]}`);
    console.log(`   To: ${new Date(filteredCandles[filteredCandles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Backtest parameters
    const initialCapital = 100000;
    let currentCapital = initialCapital;
    let position = null;
    let trades = [];
    let totalSignals = 0;
    let processedCandles = 0;
    const activeTrades = [];

    console.log(`\n💰 Backtest Parameters:`);
    console.log(`   Initial Capital: ₹${initialCapital.toLocaleString()}`);
    console.log(`   Position Size: 1 lot (25 units)`);

    console.log('\n🎯 Running Backtest...');

    // Process each candle with proper position state management
    for (let i = 0; i < filteredCandles.length; i++) {
      const currentCandles = filteredCandles.slice(0, i + 1);
      
      try {
        const currentLots = activeTrades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
        const context = {
          activeTrades,
          currentBalance: currentCapital,
          currentLots,
        };

        const evaluation = await strategy.evaluate(config, currentCandles, context);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          totalSignals++;
          
          for (const signal of evaluation.signals) {
            if (signal.type === 'ENTRY') {
              if (position) {
                continue;
              }
              // Open position
              const entryPrice = signal.data.price;
              let quantity = Math.floor(currentCapital / entryPrice);
              if (quantity <= 0) {
                continue;
              }
              const investment = quantity * entryPrice;
              
              if (investment <= currentCapital) {
                const entryDate = new Date(signal.timestamp);
                const entrySupertrend = signal.data.metadata?.entrySupertrend ?? signal.data.metadata?.supertrend ?? null;

                position = {
                  direction: signal.data.direction,
                  entryPrice,
                  quantity,
                  entryDate,
                  investment,
                  entrySupertrend,
                };
                activeTrades.push({
                  id: `trade-${trades.length + activeTrades.length + 1}-${entryDate.getTime()}`,
                  symbol: config.symbol,
                  direction: signal.data.direction,
                  entryPrice,
                  quantity,
                  entryTime: entryDate,
                  metadata: {
                    entrySupertrend,
                    supertrend: signal.data.metadata?.supertrend ?? null,
                  },
                });
                
                currentCapital -= investment;
                
                console.log(`   📈 ${signal.data.direction} Entry: ${new Date(signal.timestamp).toISOString().split('T')[0]} @ ₹${entryPrice.toFixed(2)} (Qty: ${quantity})`);
              }
            } else if (signal.type === 'EXIT' && position) {
              // Close position
              const exitPrice = signal.data.price;
              let exitQuantity = position.quantity;
              let exitValue = exitQuantity * exitPrice;
              let pnl;
              if (position.direction === 'LONG') {
                pnl = exitValue - position.investment;
              } else {
                pnl = position.investment - exitValue;
              }
              
              currentCapital += exitValue;
              
              const trade = {
                direction: position.direction,
                entryDate: position.entryDate,
                exitDate: new Date(signal.timestamp),
                entryPrice: position.entryPrice,
                exitPrice,
                quantity: position.quantity,
                pnl,
                pnlPercent: position.investment !== 0 ? (pnl / position.investment) * 100 : 0,
                duration: Math.ceil((new Date(signal.timestamp) - position.entryDate) / (1000 * 60 * 60 * 24))
              };
              
              trades.push(trade);
              const activeIndex = activeTrades.findIndex((t) => t.direction === position.direction);
              if (activeIndex >= 0) {
                activeTrades.splice(activeIndex, 1);
              }
              
              console.log(`   📉 ${position.direction} Exit: ${new Date(signal.timestamp).toISOString().split('T')[0]} @ ₹${exitPrice.toFixed(2)} | P&L: ₹${pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
              
              position = null;
            }
          }
        }
        processedCandles++;
        
      } catch (error) {
        console.error(`   ❌ Error at candle ${i + 1}: ${error.message}`);
      }
    }

    // Close any remaining position
    if (position) {
      const finalCandle = filteredCandles[filteredCandles.length - 1];
      const finalPrice = finalCandle.close;
      let exitValue = position.quantity * finalPrice;
      let pnl;
      if (position.direction === 'LONG') {
        pnl = exitValue - position.investment;
      } else {
        pnl = position.investment - exitValue;
      }

      currentCapital += exitValue;

      const trade = {
        direction: position.direction,
        entryDate: position.entryDate,
        exitDate: new Date(finalCandle.timestamp),
        entryPrice: position.entryPrice,
        exitPrice: finalPrice,
        quantity: position.quantity,
        pnl,
        pnlPercent: position.investment !== 0 ? (pnl / position.investment) * 100 : 0,
        duration: Math.ceil((new Date(finalCandle.timestamp) - position.entryDate) / (1000 * 60 * 60 * 24))
      };

      trades.push(trade);
      console.log(`   📉 Final ${position.direction} Exit: @ ₹${finalPrice.toFixed(2)} | P&L: ₹${pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    }

    // Calculate results
    const totalReturn = currentCapital - initialCapital;
    const totalReturnPct = (totalReturn / initialCapital) * 100;
    const durationYears = (new Date(filteredCandles[filteredCandles.length - 1].timestamp) - new Date(filteredCandles[0].timestamp)) / (1000 * 60 * 60 * 24 * 365);
    const annualizedReturn = Math.pow(currentCapital / initialCapital, 1 / durationYears) - 1;
    const annualizedReturnPct = annualizedReturn * 100;

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    const profitFactor = Math.abs(averageLoss) > 0 ? Math.abs(averageWin / averageLoss) : 0;
    const averageDuration = trades.length > 0 ? trades.reduce((sum, t) => sum + t.duration, 0) / trades.length : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = initialCapital;
    let currentValue = initialCapital;
    let peakDate = new Date(filteredCandles[0].timestamp);
    let drawdownStartDate = peakDate;
    let maxDrawdownStartDate = peakDate;
    let maxDrawdownTroughDate = peakDate;
    let maxDrawdownRecoveryDate = peakDate;
    let inDrawdown = false;
    let awaitingRecoveryForMax = false;
    
    for (const trade of trades) {
      const exitDate = trade.exitDate;
      currentValue += trade.pnl;
      
      if (currentValue > peak) {
        peak = currentValue;
        peakDate = exitDate;
        inDrawdown = false;
        if (awaitingRecoveryForMax) {
          maxDrawdownRecoveryDate = exitDate;
          awaitingRecoveryForMax = false;
        }
      } else {
        if (!inDrawdown) {
          inDrawdown = true;
          drawdownStartDate = peakDate;
        }
        const drawdown = (peak - currentValue) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownStartDate = drawdownStartDate;
          maxDrawdownTroughDate = exitDate;
          maxDrawdownRecoveryDate = exitDate;
          awaitingRecoveryForMax = true;
        }
      }
    }
    
    if (awaitingRecoveryForMax) {
      const finalDate = trades.length > 0
        ? trades[trades.length - 1].exitDate
        : new Date(filteredCandles[filteredCandles.length - 1].timestamp);
      maxDrawdownRecoveryDate = finalDate;
    }
    
    const maxDrawdownPct = maxDrawdown * 100;
    const msInDay = 1000 * 60 * 60 * 24;
    const maxDrawdownTroughDurationDays = Math.max(0, Math.round((maxDrawdownTroughDate.getTime() - maxDrawdownStartDate.getTime()) / msInDay));
    const maxDrawdownRecoveryDurationDays = Math.max(0, Math.round((maxDrawdownRecoveryDate.getTime() - maxDrawdownStartDate.getTime()) / msInDay));

    console.log('\n📊 BACKTEST RESULTS');
    console.log('======================================================================');
    
    console.log('\n💰 Performance Metrics:');
    console.log(`   Initial Capital: ₹${initialCapital.toLocaleString()}`);
    console.log(`   Final Capital: ₹${currentCapital.toLocaleString()}`);
    console.log(`   Total Return: ₹${totalReturn.toLocaleString()} (${totalReturnPct.toFixed(2)}%)`);
    console.log(`   Annualized Return: ${annualizedReturnPct.toFixed(2)}%`);
    console.log(`   Max Drawdown: ${maxDrawdownPct.toFixed(2)}%`);
    console.log(`   Max Drawdown Trough Duration: ${maxDrawdownTroughDurationDays} days`);
    console.log(`   Max Drawdown Recovery Duration: ${maxDrawdownRecoveryDurationDays} days`);

    console.log('\n📈 Trade Statistics:');
    console.log(`   Total Trades: ${trades.length}`);
    console.log(`   Winning Trades: ${winningTrades.length} (${winRate.toFixed(2)}%)`);
    console.log(`   Losing Trades: ${losingTrades.length} (${(100 - winRate).toFixed(2)}%)`);
    console.log(`   Average Win: ₹${averageWin.toFixed(2)}`);
    console.log(`   Average Loss: ₹${averageLoss.toFixed(2)}`);
    console.log(`   Profit Factor: ${profitFactor.toFixed(2)}`);
    console.log(`   Average Trade Duration: ${averageDuration.toFixed(1)} days`);

    console.log('\n📅 Backtest Period:');
    console.log(`   Start Date: ${new Date(filteredCandles[0].timestamp).toISOString().split('T')[0]}`);
    console.log(`   End Date: ${new Date(filteredCandles[filteredCandles.length - 1].timestamp).toISOString().split('T')[0]}`);
    console.log(`   Duration: ${durationYears.toFixed(1)} years`);
    console.log(`   Processed Candles: ${processedCandles}`);
    console.log(`   Total Signals: ${totalSignals}`);

    console.log('\n🎯 Performance Summary:');
    if (totalReturnPct > 0) {
      console.log(`   🎉 Profitable Strategy: ${totalReturnPct.toFixed(2)}% total return`);
    } else {
      console.log(`   ❌ Loss-making Strategy: ${totalReturnPct.toFixed(2)}% total return`);
    }
    console.log(`   ${annualizedReturnPct > 0 ? '📈' : '📉'} Annualized Return: ${annualizedReturnPct.toFixed(2)}%`);
    console.log(`   ${winRate > 50 ? '✅' : '📉'} Win Rate: ${winRate.toFixed(2)}%`);

    // Show recent trades
    if (trades.length > 0) {
      console.log('\n📋 Recent Trades (Last 10):');
      const recentTrades = trades.slice(-10);
      recentTrades.forEach((trade, index) => {
        const entryDate = trade.entryDate.toISOString().split('T')[0];
        const exitDate = trade.exitDate.toISOString().split('T')[0];
        const pnlSymbol = trade.pnl >= 0 ? '✅' : '❌';
        console.log(`   ${index + 1}. ${trade.direction} ${entryDate} → ${exitDate} | P&L: ₹${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%) ${pnlSymbol}`);
      });
    }

  } catch (error) {
    console.error('❌ Error running daily backtest:', error);
    console.error('Stack trace:', error.stack);
  }
}

runPriceActionDailyBacktest().catch(console.error);
