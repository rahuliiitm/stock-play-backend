const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function runPriceActionBacktest() {
  console.log('🚀 Price Action Strategy - Full Backtest with Warm-up');
  console.log('='.repeat(70));

  try {
    const strategy = new PriceActionStrategyService();

    // Strategy configuration
    const config = {
      id: 'price-action-backtest',
      name: 'Price Action Strategy with Supertrend(10,2) and MACD',
      symbol: 'NIFTY',
      timeframe: '1w',
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

    // Calculate warm-up period
    const warmupPeriod = strategy.getWarmupPeriod(config);
    console.log(`\n🔧 Warm-up Period: ${warmupPeriod} candles`);

    // Load NIFTY data
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvFile = path.join(dataDir, 'NIFTY_10year_1w.csv');
    
    if (!fs.existsSync(csvFile)) {
      console.error(`❌ Data file not found: ${csvFile}`);
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
          timeframe: '1w'
        });
      }
    }

    console.log(`   Loaded ${candles.length} candles`);
    console.log(`   Date range: ${new Date(candles[0].timestamp).toISOString().split('T')[0]} to ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Backtest parameters
    const initialCapital = 100000;
    const positionSize = 1; // 1 lot
    const lotSize = 25; // NIFTY lot size

    console.log(`\n💰 Backtest Parameters:`);
    console.log(`   Initial Capital: ₹${initialCapital.toLocaleString()}`);
    console.log(`   Position Size: ${positionSize} lot(s)`);
    console.log(`   Lot Size: ${lotSize} units per lot`);

    // Run backtest
    console.log('\n🎯 Running Backtest...');
    
    let capital = initialCapital;
    let trades = [];
    let currentTrade = null;
    let inPosition = false;
    let positionDirection = null;
    let entrySupertrend = null;
    let signals = [];
    let equity = [initialCapital];
    let maxEquity = initialCapital;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    
    for (let i = 0; i < candles.length; i++) {
      const currentCandles = candles.slice(0, i + 1);
      
      // Skip warm-up period
      if (i < warmupPeriod - 1) {
        continue;
      }
      
      try {
        const evaluation = await strategy.evaluate(config, currentCandles);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          for (const signal of evaluation.signals) {
            if (signal.type === 'ENTRY' && !inPosition) {
              // Entry signal
              inPosition = true;
              positionDirection = signal.direction;
              entrySupertrend = signal.metadata?.entrySupertrend;
              
              const quantity = Math.floor(capital / (candles[i].close * lotSize)) * lotSize;
              if (quantity >= lotSize) {
                currentTrade = {
                  entryDate: new Date(candles[i].timestamp).toISOString().split('T')[0],
                  entryPrice: candles[i].close,
                  direction: signal.direction,
                  quantity: quantity,
                  entrySupertrend: entrySupertrend,
                  entryCapital: capital
                };
                
                signals.push({
                  candle: i + 1,
                  date: new Date(candles[i].timestamp).toISOString().split('T')[0],
                  type: 'ENTRY',
                  direction: signal.direction,
                  price: candles[i].close,
                  quantity: quantity
                });
                
                console.log(`   📈 ENTRY ${signal.direction} @ ₹${candles[i].close} (${new Date(candles[i].timestamp).toISOString().split('T')[0]}) - Qty: ${quantity}`);
              }
              
            } else if (signal.type === 'EXIT' && inPosition && currentTrade) {
              // Exit signal
              const exitPrice = candles[i].close;
              const pnl = positionDirection === 'LONG' 
                ? (exitPrice - currentTrade.entryPrice) * currentTrade.quantity
                : (currentTrade.entryPrice - exitPrice) * currentTrade.quantity;
              
              const pnlPercentage = (pnl / (currentTrade.entryPrice * currentTrade.quantity)) * 100;
              
              currentTrade.exitDate = new Date(candles[i].timestamp).toISOString().split('T')[0];
              currentTrade.exitPrice = exitPrice;
              currentTrade.pnl = pnl;
              currentTrade.pnlPercentage = pnlPercentage;
              currentTrade.duration = Math.ceil((new Date(candles[i].timestamp) - new Date(currentTrade.entryDate + 'T00:00:00')) / (1000 * 60 * 60 * 24 * 7)); // weeks
              
              capital += pnl;
              trades.push(currentTrade);
              
              signals.push({
                candle: i + 1,
                date: new Date(candles[i].timestamp).toISOString().split('T')[0],
                type: 'EXIT',
                direction: signal.direction,
                price: exitPrice,
                pnl: pnl,
                pnlPercentage: pnlPercentage
              });
              
              const pnlSign = pnl >= 0 ? '+' : '';
              console.log(`   📉 EXIT ${signal.direction} @ ₹${exitPrice} (${new Date(candles[i].timestamp).toISOString().split('T')[0]}) - P&L: ${pnlSign}₹${pnl.toFixed(2)} (${pnlSign}${pnlPercentage.toFixed(2)}%)`);
              
              inPosition = false;
              positionDirection = null;
              entrySupertrend = null;
              currentTrade = null;
            }
          }
        }
        
        // Update equity and drawdown
        if (inPosition && currentTrade) {
          const currentPrice = candles[i].close;
          const unrealizedPnl = positionDirection === 'LONG' 
            ? (currentPrice - currentTrade.entryPrice) * currentTrade.quantity
            : (currentTrade.entryPrice - currentPrice) * currentTrade.quantity;
          const currentEquity = capital + unrealizedPnl;
          equity.push(currentEquity);
          
          if (currentEquity > maxEquity) {
            maxEquity = currentEquity;
            currentDrawdown = 0;
          } else {
            currentDrawdown = ((maxEquity - currentEquity) / maxEquity) * 100;
            if (currentDrawdown > maxDrawdown) {
              maxDrawdown = currentDrawdown;
            }
          }
        } else {
          equity.push(capital);
        }
        
      } catch (error) {
        if (i % 50 === 0) {
          console.log(`   ⚠️  Error at candle ${i + 1}: ${error.message}`);
        }
      }
    }

    // Calculate final metrics
    const totalReturn = capital - initialCapital;
    const totalReturnPercentage = (totalReturn / initialCapital) * 100;
    
    // Calculate annualized return
    const startDate = new Date(candles[warmupPeriod - 1].timestamp);
    const endDate = new Date(candles[candles.length - 1].timestamp);
    const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    const annualizedReturn = (Math.pow(capital / initialCapital, 1 / years) - 1) * 100;
    
    // Trade statistics
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin * winningTrades.length / (avgLoss * losingTrades.length)) : 0;
    
    const avgTradeDuration = trades.length > 0 ? trades.reduce((sum, t) => sum + t.duration, 0) / trades.length : 0;

    // Display results
    console.log('\n📊 BACKTEST RESULTS');
    console.log('='.repeat(70));
    
    console.log(`\n💰 Performance Metrics:`);
    console.log(`   Initial Capital: ₹${initialCapital.toLocaleString()}`);
    console.log(`   Final Capital: ₹${capital.toLocaleString()}`);
    console.log(`   Total Return: ₹${totalReturn.toLocaleString()} (${totalReturnPercentage.toFixed(2)}%)`);
    console.log(`   Annualized Return: ${annualizedReturn.toFixed(2)}%`);
    console.log(`   Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
    
    console.log(`\n📈 Trade Statistics:`);
    console.log(`   Total Trades: ${trades.length}`);
    console.log(`   Winning Trades: ${winningTrades.length} (${winRate.toFixed(2)}%)`);
    console.log(`   Losing Trades: ${losingTrades.length} (${(100 - winRate).toFixed(2)}%)`);
    console.log(`   Average Win: ₹${avgWin.toFixed(2)}`);
    console.log(`   Average Loss: ₹${avgLoss.toFixed(2)}`);
    console.log(`   Profit Factor: ${profitFactor.toFixed(2)}`);
    console.log(`   Average Trade Duration: ${avgTradeDuration.toFixed(1)} weeks`);
    
    console.log(`\n📅 Backtest Period:`);
    console.log(`   Start Date: ${new Date(candles[warmupPeriod - 1].timestamp).toISOString().split('T')[0]}`);
    console.log(`   End Date: ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);
    console.log(`   Duration: ${years.toFixed(1)} years`);
    console.log(`   Warm-up Period: ${warmupPeriod} candles (${(warmupPeriod / 52).toFixed(1)} years)`);
    
    if (trades.length > 0) {
      console.log(`\n📈 Recent Trades (Last 10):`);
      trades.slice(-10).forEach((trade, i) => {
        const pnlSign = trade.pnl >= 0 ? '+' : '';
        console.log(`   ${trades.length - 9 + i}. ${trade.direction} ${trade.entryDate} → ${trade.exitDate} | ₹${trade.entryPrice} → ₹${trade.exitPrice} | P&L: ${pnlSign}₹${trade.pnl.toFixed(2)} (${pnlSign}${trade.pnlPercentage.toFixed(2)}%) | ${trade.duration}w`);
      });
    }

    // Performance summary
    console.log(`\n🎯 Performance Summary:`);
    if (totalReturnPercentage > 0) {
      console.log(`   ✅ Profitable Strategy: +${totalReturnPercentage.toFixed(2)}% total return`);
    } else {
      console.log(`   ❌ Loss-making Strategy: ${totalReturnPercentage.toFixed(2)}% total return`);
    }
    
    if (annualizedReturn > 10) {
      console.log(`   🚀 Strong Annualized Return: ${annualizedReturn.toFixed(2)}%`);
    } else if (annualizedReturn > 5) {
      console.log(`   📈 Decent Annualized Return: ${annualizedReturn.toFixed(2)}%`);
    } else {
      console.log(`   📉 Low Annualized Return: ${annualizedReturn.toFixed(2)}%`);
    }
    
    if (winRate > 60) {
      console.log(`   🎯 High Win Rate: ${winRate.toFixed(2)}%`);
    } else if (winRate > 50) {
      console.log(`   📊 Moderate Win Rate: ${winRate.toFixed(2)}%`);
    } else {
      console.log(`   📉 Low Win Rate: ${winRate.toFixed(2)}%`);
    }

  } catch (error) {
    console.error('❌ Error running price action backtest:', error);
    console.error('Stack trace:', error.stack);
  }
}

runPriceActionBacktest().catch(console.error);
