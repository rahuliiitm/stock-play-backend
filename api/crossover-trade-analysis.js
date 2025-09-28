#!/usr/bin/env node

/**
 * Crossover Trade Analysis with GapNorm Logging
 * 
 * This script analyzes EMA crossovers, logs GapNorm values, and tracks
 * whether they resulted in successful trades or failures.
 * 
 * Goal: Identify the optimal ATR multiplier threshold based on historical data.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Simple EMA calculation function
function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i].close * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

// ATR calculation function
function calculateATR(data, period) {
  const atr = [];
  
  // Calculate True Range for each candle
  const trueRanges = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }
  
  // Calculate ATR using EMA of True Range
  const multiplier = 2 / (period + 1);
  
  // Start with SMA of first period True Ranges
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }
  atr[period - 1] = sum / period;
  
  // Calculate ATR for remaining values
  for (let i = period; i < trueRanges.length; i++) {
    atr[i] = (trueRanges[i] * multiplier) + (atr[i - 1] * (1 - multiplier));
  }
  
  return atr;
}

// RSI calculation function
function calculateRSI(data, period) {
  const rsi = [];
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate initial averages
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    const rs = avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);
  }
  
  return rsi;
}

// Simulate trade outcome based on future price movement
function simulateTradeOutcome(candles, crossoverIndex, direction, lookAheadPeriods = 20) {
  if (crossoverIndex + lookAheadPeriods >= candles.length) {
    return { outcome: 'INSUFFICIENT_DATA', pnl: 0, exitPrice: candles[candles.length - 1].close };
  }
  
  const entryPrice = candles[crossoverIndex].close;
  const entryTime = new Date(candles[crossoverIndex].timestamp);
  
  // Look ahead to find the best exit point
  let bestPnL = 0;
  let bestExitPrice = entryPrice;
  let bestExitTime = entryTime;
  
  for (let i = 1; i <= lookAheadPeriods; i++) {
    const futureIndex = crossoverIndex + i;
    if (futureIndex >= candles.length) break;
    
    const futurePrice = candles[futureIndex].close;
    const futureTime = new Date(candles[futureIndex].timestamp);
    
    let pnl;
    if (direction === 'LONG') {
      pnl = futurePrice - entryPrice;
    } else {
      pnl = entryPrice - futurePrice;
    }
    
    if (pnl > bestPnL) {
      bestPnL = pnl;
      bestExitPrice = futurePrice;
      bestExitTime = futureTime;
    }
  }
  
  // Determine trade outcome
  let outcome;
  if (bestPnL > 0) {
    if (bestPnL > entryPrice * 0.02) { // > 2% profit
      outcome = 'PROFITABLE';
    } else {
      outcome = 'SMALL_PROFIT';
    }
  } else if (bestPnL < -entryPrice * 0.01) { // > 1% loss
    outcome = 'LOSS';
  } else {
    outcome = 'BREAKEVEN';
  }
  
  return {
    outcome,
    pnl: bestPnL,
    exitPrice: bestExitPrice,
    exitTime: bestExitTime,
    holdingPeriod: Math.round((bestExitTime - entryTime) / (1000 * 60 * 15)) // in 15-min periods
  };
}

// Analyze crossovers with trade simulation
function analyzeCrossoverTrades(candles, fastPeriod = 9, slowPeriod = 21, atrPeriod = 14) {
  console.log(`🔍 Analyzing crossover trades with EMA ${fastPeriod}/${slowPeriod} and ATR ${atrPeriod}`);
  
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);
  const atrValues = calculateATR(candles, atrPeriod);
  const rsiValues = calculateRSI(candles, 14);
  
  console.log(`📊 Indicators calculated:`);
  console.log(`   Fast EMA: ${fastEma.length} values`);
  console.log(`   Slow EMA: ${slowEma.length} values`);
  console.log(`   ATR: ${atrValues.length} values`);
  console.log(`   RSI: ${rsiValues.length} values`);
  
  const crossoverEvents = [];
  const tradeAnalysis = [];
  
  // Test different ATR multiplier thresholds
  const atrThresholds = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];
  const thresholdResults = {};
  
  // Initialize results for each threshold
  atrThresholds.forEach(threshold => {
    thresholdResults[threshold] = {
      totalCrossovers: 0,
      qualifyingCrossovers: 0,
      successfulTrades: 0,
      failedTrades: 0,
      profitableTrades: 0,
      lossTrades: 0,
      totalPnL: 0,
      avgGapNorm: 0,
      gapNormValues: []
    };
  });
  
  // Find crossovers and analyze conditions
  for (let i = Math.max(fastPeriod, slowPeriod, atrPeriod); i < candles.length - 20; i++) {
    const prevFast = fastEma[i - 1];
    const prevSlow = slowEma[i - 1];
    const currentFast = fastEma[i];
    const currentSlow = slowEma[i];
    
    const atr = atrValues[i - atrPeriod] || 0;
    const rsi = rsiValues[i - 14] || 50;
    const candle = candles[i];
    
    // Detect crossovers
    const crossedUp = prevFast <= prevSlow && currentFast > currentSlow;
    const crossedDown = prevFast >= prevSlow && currentFast < currentSlow;
    
    if (crossedUp || crossedDown) {
      const gapAbs = Math.abs(currentFast - currentSlow);
      const gapNorm = atr > 0 ? gapAbs / atr : 0;
      
      const direction = crossedUp ? 'LONG' : 'SHORT';
      
      // Simulate trade outcome
      const tradeResult = simulateTradeOutcome(candles, i, direction);
      
      const crossoverEvent = {
        index: i,
        timestamp: new Date(candle.timestamp).toISOString(),
        direction,
        price: candle.close,
        fastEma: currentFast,
        slowEma: currentSlow,
        atr: atr,
        rsi: rsi,
        gapAbs: gapAbs,
        gapNorm: gapNorm,
        tradeResult: tradeResult
      };
      
      crossoverEvents.push(crossoverEvent);
      
      // Test against all ATR thresholds
      atrThresholds.forEach(threshold => {
        const qualifies = gapNorm >= threshold;
        thresholdResults[threshold].totalCrossovers++;
        
        if (qualifies) {
          thresholdResults[threshold].qualifyingCrossovers++;
          thresholdResults[threshold].gapNormValues.push(gapNorm);
          
          if (tradeResult.outcome === 'PROFITABLE' || tradeResult.outcome === 'SMALL_PROFIT') {
            thresholdResults[threshold].successfulTrades++;
            thresholdResults[threshold].profitableTrades++;
          } else if (tradeResult.outcome === 'LOSS') {
            thresholdResults[threshold].failedTrades++;
            thresholdResults[threshold].lossTrades++;
          }
          
          thresholdResults[threshold].totalPnL += tradeResult.pnl;
        }
      });
      
      // Log detailed crossover event
      const logEntry = {
        timestamp: crossoverEvent.timestamp,
        direction: crossoverEvent.direction,
        price: parseFloat(crossoverEvent.price.toFixed(2)),
        fastEma: parseFloat(crossoverEvent.fastEma.toFixed(2)),
        slowEma: parseFloat(crossoverEvent.slowEma.toFixed(2)),
        atr: parseFloat(crossoverEvent.atr.toFixed(2)),
        rsi: parseFloat(crossoverEvent.rsi.toFixed(2)),
        gapAbs: parseFloat(crossoverEvent.gapAbs.toFixed(2)),
        gapNorm: parseFloat(crossoverEvent.gapNorm.toFixed(4)),
        tradeOutcome: tradeResult.outcome,
        pnl: parseFloat(tradeResult.pnl.toFixed(2)),
        exitPrice: parseFloat(tradeResult.exitPrice.toFixed(2)),
        holdingPeriod: tradeResult.holdingPeriod
      };
      
      tradeAnalysis.push(logEntry);
      
      console.log(`\n🎯 ${direction} Crossover at ${crossoverEvent.timestamp}:`);
      console.log(`   Price: ₹${crossoverEvent.price.toFixed(2)}`);
      console.log(`   Fast EMA: ${crossoverEvent.fastEma.toFixed(2)} (prev: ${prevFast.toFixed(2)})`);
      console.log(`   Slow EMA: ${crossoverEvent.slowEma.toFixed(2)} (prev: ${prevSlow.toFixed(2)})`);
      console.log(`   ATR: ${crossoverEvent.atr.toFixed(2)}`);
      console.log(`   RSI: ${crossoverEvent.rsi.toFixed(2)}`);
      console.log(`   Gap Abs: ${crossoverEvent.gapAbs.toFixed(2)}`);
      console.log(`   Gap Norm: ${crossoverEvent.gapNorm.toFixed(4)} (ATR multiple)`);
      console.log(`   Trade Outcome: ${tradeResult.outcome}`);
      console.log(`   PnL: ₹${tradeResult.pnl.toFixed(2)}`);
      console.log(`   Exit Price: ₹${tradeResult.exitPrice.toFixed(2)}`);
      console.log(`   Holding Period: ${tradeResult.holdingPeriod} periods`);
    }
  }
  
  // Calculate average GapNorm for each threshold
  atrThresholds.forEach(threshold => {
    if (thresholdResults[threshold].gapNormValues.length > 0) {
      thresholdResults[threshold].avgGapNorm = 
        thresholdResults[threshold].gapNormValues.reduce((sum, val) => sum + val, 0) / 
        thresholdResults[threshold].gapNormValues.length;
    }
  });
  
  return { crossoverEvents, tradeAnalysis, thresholdResults };
}

async function runCrossoverTradeAnalysis() {
  try {
    console.log('🔍 Crossover Trade Analysis with GapNorm Logging');
    console.log('=' .repeat(70));
    
    const dataPath = '/Users/rjain/stockplay/stock-play-backend/api/data/NIFTY_15m.csv';
    
    if (!fs.existsSync(dataPath)) {
      console.error('❌ Data file not found:', dataPath);
      return;
    }
    
    const candles = [];
    let rowCount = 0;
    
    console.log('📖 Reading CSV data...');
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(dataPath)
        .pipe(csv())
        .on('data', (row) => {
          const timestamp = parseInt(row.timestamp);
          const candle = {
            timestamp,
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseFloat(row.volume || 0)
          };
          
          candles.push(candle);
          rowCount++;
          
          if (rowCount % 1000 === 0) {
            console.log(`   Processed ${rowCount} rows...`);
          }
        })
        .on('end', () => {
          console.log(`✅ Successfully loaded ${candles.length} candles`);
          
          // Analyze with different configurations
          const configs = [
            { fast: 9, slow: 21, atr: 14, name: '9/21 EMA, ATR 14' },
            { fast: 5, slow: 15, atr: 14, name: '5/15 EMA, ATR 14' }
          ];
          
          const allResults = {};
          
          configs.forEach(config => {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`📊 Configuration: ${config.name}`);
            console.log(`${'='.repeat(70)}`);
            
            const { crossoverEvents, tradeAnalysis, thresholdResults } = analyzeCrossoverTrades(
              candles, 
              config.fast, 
              config.slow, 
              config.atr
            );
            
            allResults[config.name] = { crossoverEvents, tradeAnalysis, thresholdResults };
            
            console.log(`\n📈 Summary for ${config.name}:`);
            console.log(`   Total crossovers: ${crossoverEvents.length}`);
            
            const bullishCrossovers = crossoverEvents.filter(c => c.direction === 'LONG');
            const bearishCrossovers = crossoverEvents.filter(c => c.direction === 'SHORT');
            
            console.log(`   Bullish crossovers: ${bullishCrossovers.length}`);
            console.log(`   Bearish crossovers: ${bearishCrossovers.length}`);
            
            // Show threshold analysis
            console.log(`\n📊 ATR Threshold Analysis:`);
            console.log(`   Threshold | Qualifying | Success Rate | Avg GapNorm | Total PnL`);
            console.log(`   ---------|------------|--------------|-------------|----------`);
            
            Object.keys(thresholdResults).forEach(threshold => {
              const result = thresholdResults[threshold];
              const successRate = result.qualifyingCrossovers > 0 ? 
                (result.successfulTrades / result.qualifyingCrossovers * 100).toFixed(1) : '0.0';
              const avgGapNorm = result.avgGapNorm.toFixed(4);
              const totalPnL = result.totalPnL.toFixed(2);
              
              console.log(`   ${threshold.toString().padStart(8)} | ${result.qualifyingCrossovers.toString().padStart(10)} | ${successRate.toString().padStart(11)}% | ${avgGapNorm.toString().padStart(10)} | ₹${totalPnL.toString().padStart(8)}`);
            });
            
            // Find optimal threshold
            let bestThreshold = null;
            let bestScore = -Infinity;
            
            Object.keys(thresholdResults).forEach(threshold => {
              const result = thresholdResults[threshold];
              if (result.qualifyingCrossovers > 10) { // Minimum sample size
                const successRate = result.successfulTrades / result.qualifyingCrossovers;
                const avgPnL = result.totalPnL / result.qualifyingCrossovers;
                const score = successRate * avgPnL * Math.log(result.qualifyingCrossovers); // Weighted score
                
                if (score > bestScore) {
                  bestScore = score;
                  bestThreshold = threshold;
                }
              }
            });
            
            if (bestThreshold) {
              console.log(`\n🎯 Optimal ATR Threshold: ${bestThreshold}`);
              console.log(`   Qualifying trades: ${thresholdResults[bestThreshold].qualifyingCrossovers}`);
              console.log(`   Success rate: ${(thresholdResults[bestThreshold].successfulTrades / thresholdResults[bestThreshold].qualifyingCrossovers * 100).toFixed(1)}%`);
              console.log(`   Total PnL: ₹${thresholdResults[bestThreshold].totalPnL.toFixed(2)}`);
            }
          });
          
          // Write detailed logs to files
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          
          // Write crossover events log
          const crossoverLogPath = `/Users/rjain/stockplay/stock-play-backend/api/crossover-events-${timestamp}.json`;
          fs.writeFileSync(crossoverLogPath, JSON.stringify(allResults, null, 2));
          console.log(`\n📝 Crossover events saved to: ${crossoverLogPath}`);
          
          // Write trade analysis CSV
          const tradeCsvPath = `/Users/rjain/stockplay/stock-play-backend/api/trade-analysis-${timestamp}.csv`;
          const csvHeader = 'timestamp,direction,price,fastEma,slowEma,atr,rsi,gapAbs,gapNorm,tradeOutcome,pnl,exitPrice,holdingPeriod\n';
          const csvData = allResults['9/21 EMA, ATR 14'].tradeAnalysis.map(trade => 
            `${trade.timestamp},${trade.direction},${trade.price},${trade.fastEma},${trade.slowEma},${trade.atr},${trade.rsi},${trade.gapAbs},${trade.gapNorm},${trade.tradeOutcome},${trade.pnl},${trade.exitPrice},${trade.holdingPeriod}`
          ).join('\n');
          
          fs.writeFileSync(tradeCsvPath, csvHeader + csvData);
          console.log(`📊 Trade analysis CSV saved to: ${tradeCsvPath}`);
          
          // Summary statistics
          console.log(`\n📊 Overall Summary:`);
          const mainResults = allResults['9/21 EMA, ATR 14'];
          console.log(`   Total crossover events: ${mainResults.crossoverEvents.length}`);
          
          const avgGapNorm = mainResults.tradeAnalysis.reduce((sum, t) => sum + t.gapNorm, 0) / mainResults.tradeAnalysis.length;
          const profitableTrades = mainResults.tradeAnalysis.filter(t => t.tradeOutcome === 'PROFITABLE' || t.tradeOutcome === 'SMALL_PROFIT').length;
          const lossTrades = mainResults.tradeAnalysis.filter(t => t.tradeOutcome === 'LOSS').length;
          
          console.log(`   Average GapNorm: ${avgGapNorm.toFixed(4)}`);
          console.log(`   Profitable trades: ${profitableTrades}`);
          console.log(`   Loss trades: ${lossTrades}`);
          console.log(`   Success rate: ${(profitableTrades / mainResults.tradeAnalysis.length * 100).toFixed(1)}%`);
          
          console.log('\n✅ Crossover Trade Analysis Complete!');
          console.log('\n📋 Next Steps:');
          console.log('   1. Review the CSV file to see individual trade outcomes');
          console.log('   2. Analyze the optimal ATR threshold recommendations');
          console.log('   3. Adjust strategy parameters based on findings');
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error in analysis:', error.message);
  }
}

runCrossoverTradeAnalysis();
