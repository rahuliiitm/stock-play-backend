const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function testPriceActionBacktest() {
  console.log('🔧 Testing Price Action Strategy Backtest with Warm-up');
  console.log('='.repeat(60));

  try {
    const strategy = new PriceActionStrategyService();

    // Test configuration
    const config = {
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
    };

    console.log('\n📊 Strategy Configuration:');
    console.log(`   Name: ${config.name}`);
    console.log(`   Symbol: ${config.symbol}`);
    console.log(`   Timeframe: ${config.timeframe}`);
    console.log(`   Supertrend: ${config.supertrendPeriod} (${config.supertrendMultiplier}x)`);
    console.log(`   ATR: ${config.atrPeriod}`);
    console.log(`   MACD: ${config.macdFast}/${config.macdSlow}/${config.macdSignal}`);

    // Test warm-up period calculation
    console.log('\n🔧 Testing Warm-up Period Calculation:');
    const warmupPeriod = strategy.getWarmupPeriod(config);
    console.log(`   Warm-up Period: ${warmupPeriod} candles`);

    // Load real NIFTY data
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

    // Test strategy evaluation with warm-up period
    console.log('\n🎯 Testing Strategy Evaluation with Warm-up:');
    
    let signals = [];
    let inPosition = false;
    let positionDirection = null;
    let entrySupertrend = null;
    let trades = [];
    let currentTrade = null;
    
    for (let i = 0; i < candles.length; i++) {
      const currentCandles = candles.slice(0, i + 1);
      
      // Skip warm-up period
      if (i < warmupPeriod - 1) {
        if (i % 20 === 0) {
          console.log(`   ⏳ Skipping candle ${i + 1} (warm-up period: ${warmupPeriod})`);
        }
        continue;
      }
      
      try {
        const evaluation = await strategy.evaluate(config, currentCandles);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          for (const signal of evaluation.signals) {
            if (signal.type === 'ENTRY' && !inPosition) {
              inPosition = true;
              positionDirection = signal.direction;
              entrySupertrend = signal.metadata?.entrySupertrend;
              
              currentTrade = {
                entryDate: new Date(candles[i].timestamp).toISOString().split('T')[0],
                entryPrice: candles[i].close,
                direction: signal.direction,
                entrySupertrend: entrySupertrend
              };
              
              signals.push({
                candle: i + 1,
                date: new Date(candles[i].timestamp).toISOString().split('T')[0],
                type: 'ENTRY',
                direction: signal.direction,
                price: candles[i].close,
                supertrend: signal.metadata?.entrySupertrend
              });
              
              console.log(`   📈 ENTRY ${signal.direction} @ ₹${candles[i].close} (${new Date(candles[i].timestamp).toISOString().split('T')[0]})`);
              
            } else if (signal.type === 'EXIT' && inPosition) {
              if (currentTrade) {
                currentTrade.exitDate = new Date(candles[i].timestamp).toISOString().split('T')[0];
                currentTrade.exitPrice = candles[i].close;
                currentTrade.pnl = positionDirection === 'LONG' 
                  ? (candles[i].close - currentTrade.entryPrice) 
                  : (currentTrade.entryPrice - candles[i].close);
                currentTrade.pnlPercentage = (currentTrade.pnl / currentTrade.entryPrice) * 100;
                trades.push(currentTrade);
              }
              
              inPosition = false;
              positionDirection = null;
              entrySupertrend = null;
              currentTrade = null;
              
              signals.push({
                candle: i + 1,
                date: new Date(candles[i].timestamp).toISOString().split('T')[0],
                type: 'EXIT',
                direction: signal.direction,
                price: candles[i].close
              });
              
              console.log(`   📉 EXIT ${signal.direction} @ ₹${candles[i].close} (${new Date(candles[i].timestamp).toISOString().split('T')[0]})`);
            }
          }
        }
      } catch (error) {
        if (i % 20 === 0) {
          console.log(`   ⚠️  Error at candle ${i + 1}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Results Summary:');
    console.log(`   Total Signals: ${signals.length}`);
    console.log(`   Total Trades: ${trades.length}`);
    console.log(`   Warm-up Period: ${warmupPeriod} candles`);
    console.log(`   Processed Candles: ${candles.length - warmupPeriod + 1}`);
    
    if (trades.length > 0) {
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
      const winRate = (winningTrades.length / trades.length) * 100;
      
      console.log(`\n📈 Trade Performance:`);
      console.log(`   Total P&L: ₹${totalPnl.toFixed(2)}`);
      console.log(`   Win Rate: ${winRate.toFixed(2)}%`);
      console.log(`   Winning Trades: ${winningTrades.length}`);
      console.log(`   Losing Trades: ${losingTrades.length}`);
      
      console.log('\n📈 Trade Details:');
      trades.slice(0, 10).forEach((trade, i) => {
        const pnlSign = trade.pnl >= 0 ? '+' : '';
        console.log(`   ${i + 1}. ${trade.direction} ${trade.entryDate} → ${trade.exitDate} | ₹${trade.entryPrice} → ₹${trade.exitPrice} | P&L: ${pnlSign}₹${trade.pnl.toFixed(2)} (${pnlSign}${trade.pnlPercentage.toFixed(2)}%)`);
      });
      
      if (trades.length > 10) {
        console.log(`   ... and ${trades.length - 10} more trades`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing price action backtest:', error);
    console.error('Stack trace:', error.stack);
  }
}

testPriceActionBacktest().catch(console.error);
