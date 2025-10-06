const fs = require('fs');
const path = require('path');

/**
 * Simple Price Action Strategy Daily Backtest
 * 
 * This test bypasses the full NestJS application context to avoid
 * the crypto/scheduler issues and focuses on the core strategy logic
 * using our existing data provider and mocked broker interactions.
 */

// Import the compiled strategy service
const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');

// Mock the StrategyIndicatorsService to avoid dependency injection issues
class MockStrategyIndicatorsService {
  calculateSupertrend(candles, period, multiplier) {
    // Simple mock implementation - in real scenario this would use the centralized indicators
    if (candles.length < period + 10) return null;
    
    // Mock Supertrend calculation
    const latestCandle = candles[candles.length - 1];
    const mockSupertrend = latestCandle.close * 0.98; // Mock value
    const isBullish = latestCandle.close > mockSupertrend;
    
    return {
      supertrend: mockSupertrend,
      isBullish,
      isBearish: !isBullish,
      trendDirection: isBullish ? 'UPTREND' : 'DOWNTREND'
    };
  }

  calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod) {
    // Simple mock implementation
    if (candles.length < slowPeriod + signalPeriod) return null;
    
    const latestCandle = candles[candles.length - 1];
    const mockMACD = latestCandle.close * 0.01; // Mock value
    const mockSignal = mockMACD * 0.8; // Mock signal
    const isBullish = mockMACD > mockSignal;
    
    return {
      macd: mockMACD,
      signal: mockSignal,
      isBullish,
      isBearish: !isBullish
    };
  }
}

async function runPriceActionDailyBacktest() {
  console.log('🚀 Price Action Strategy - Daily Backtest (8-9 Years)');
  console.log('='.repeat(70));

  try {
    // Create strategy instance with mock indicators service
    const mockIndicatorsService = new MockStrategyIndicatorsService();
    const strategy = new PriceActionStrategyService(mockIndicatorsService);

    // Strategy configuration
    const config = {
      id: 'price-action-daily',
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

    console.log(`\n💰 Backtest Parameters:`);
    console.log(`   Initial Capital: ₹${initialCapital.toLocaleString()}`);
    console.log(`   Position Size: 1 lot (25 units)`);

    console.log('\n🎯 Running Backtest...');

    // Process each candle
    for (let i = 0; i < filteredCandles.length; i++) {
      const currentCandles = filteredCandles.slice(0, i + 1);
      
      try {
        const evaluation = await strategy.evaluate(config, currentCandles);
        
        if (evaluation && evaluation.signals && evaluation.signals.length > 0) {
          totalSignals++;
          
          for (const signal of evaluation.signals) {
            if (signal.type === 'ENTRY' && !position) {
              // Open position
              const quantity = 25; // 1 lot
              const entryPrice = signal.price;
              const investment = quantity * entryPrice;
              
              if (investment <= currentCapital) {
                position = {
                  direction: signal.direction,
                  entryPrice,
                  quantity,
                  entryDate: new Date(signal.timestamp),
                  investment
                };
                
                currentCapital -= investment;
                
                console.log(`   📈 ${signal.direction} Entry: ${new Date(signal.timestamp).toISOString().split('T')[0]} @ ₹${entryPrice.toFixed(2)} (Qty: ${quantity})`);
              }
            } else if (signal.type === 'EXIT' && position) {
              // Close position
              const exitPrice = signal.price;
              const exitValue = position.quantity * exitPrice;
              const pnl = position.direction === 'LONG' 
                ? exitValue - position.investment
                : position.investment - exitValue;
              
              currentCapital += exitValue;
              
              const trade = {
                direction: position.direction,
                entryDate: position.entryDate,
                exitDate: new Date(signal.timestamp),
                entryPrice: position.entryPrice,
                exitPrice,
                quantity: position.quantity,
                pnl,
                pnlPercent: (pnl / position.investment) * 100,
                duration: Math.ceil((new Date(signal.timestamp) - position.entryDate) / (1000 * 60 * 60 * 24))
              };
              
              trades.push(trade);
              
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
      const finalPrice = filteredCandles[filteredCandles.length - 1].close;
      const exitValue = position.quantity * finalPrice;
      const pnl = position.direction === 'LONG' 
        ? exitValue - position.investment
        : position.investment - exitValue;
      
      currentCapital += exitValue;
      
      const trade = {
        direction: position.direction,
        entryDate: position.entryDate,
        exitDate: new Date(filteredCandles[filteredCandles.length - 1].timestamp),
        entryPrice: position.entryPrice,
        exitPrice: finalPrice,
        quantity: position.quantity,
        pnl,
        pnlPercent: (pnl / position.investment) * 100,
        duration: Math.ceil((new Date(filteredCandles[filteredCandles.length - 1].timestamp) - position.entryDate) / (1000 * 60 * 60 * 24))
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
    
    for (const trade of trades) {
      currentValue += trade.pnl;
      if (currentValue > peak) peak = currentValue;
      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    const maxDrawdownPct = maxDrawdown * 100;

    console.log('\n📊 BACKTEST RESULTS');
    console.log('======================================================================');
    
    console.log('\n💰 Performance Metrics:');
    console.log(`   Initial Capital: ₹${initialCapital.toLocaleString()}`);
    console.log(`   Final Capital: ₹${currentCapital.toLocaleString()}`);
    console.log(`   Total Return: ₹${totalReturn.toLocaleString()} (${totalReturnPct.toFixed(2)}%)`);
    console.log(`   Annualized Return: ${annualizedReturnPct.toFixed(2)}%`);
    console.log(`   Max Drawdown: ${maxDrawdownPct.toFixed(2)}%`);

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
