#!/usr/bin/env node

/**
 * Debug Crossover and ATR Analysis
 * 
 * This script analyzes EMA crossovers and ATR values to understand
 * why the strategy is not generating trades.
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

// Detect crossovers and analyze ATR conditions
function analyzeCrossovers(candles, fastPeriod = 9, slowPeriod = 21, atrPeriod = 14) {
  console.log(`🔍 Analyzing crossovers with EMA ${fastPeriod}/${slowPeriod} and ATR ${atrPeriod}`);
  
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);
  const atrValues = calculateATR(candles, atrPeriod);
  const rsiValues = calculateRSI(candles, 14);
  
  console.log(`📊 Indicators calculated:`);
  console.log(`   Fast EMA: ${fastEma.length} values`);
  console.log(`   Slow EMA: ${slowEma.length} values`);
  console.log(`   ATR: ${atrValues.length} values`);
  console.log(`   RSI: ${rsiValues.length} values`);
  
  const crossovers = [];
  const logData = [];
  
  // Find crossovers and analyze conditions
  for (let i = Math.max(fastPeriod, slowPeriod, atrPeriod); i < candles.length; i++) {
    const prevFast = fastEma[i - 1];
    const prevSlow = slowEma[i - 1];
    const currentFast = fastEma[i];
    const currentSlow = slowEma[i];
    
    const atr = atrValues[i - atrPeriod] || 0; // ATR is offset by atrPeriod
    const rsi = rsiValues[i - 14] || 50; // RSI is offset by 14
    const candle = candles[i];
    
    // Detect crossovers
    const crossedUp = prevFast <= prevSlow && currentFast > currentSlow;
    const crossedDown = prevFast >= prevSlow && currentFast < currentSlow;
    
    if (crossedUp || crossedDown) {
      const gapAbs = Math.abs(currentFast - currentSlow);
      const gapNorm = atr > 0 ? gapAbs / atr : 0;
      
      const crossover = {
        type: crossedUp ? 'BULLISH' : 'BEARISH',
        index: i,
        timestamp: new Date(candle.timestamp).toISOString(),
        price: candle.close,
        fastEma: currentFast,
        slowEma: currentSlow,
        prevFastEma: prevFast,
        prevSlowEma: prevSlow,
        atr: atr,
        rsi: rsi,
        gapAbs: gapAbs,
        gapNorm: gapNorm,
        candleHigh: candle.high,
        candleLow: candle.low,
        candleOpen: candle.open,
        candleClose: candle.close
      };
      
      crossovers.push(crossover);
      
      // Log detailed analysis
      const logEntry = {
        timestamp: crossover.timestamp,
        type: crossover.type,
        price: crossover.price,
        fastEma: parseFloat(crossover.fastEma.toFixed(2)),
        slowEma: parseFloat(crossover.slowEma.toFixed(2)),
        atr: parseFloat(crossover.atr.toFixed(2)),
        rsi: parseFloat(crossover.rsi.toFixed(2)),
        gapAbs: parseFloat(crossover.gapAbs.toFixed(2)),
        gapNorm: parseFloat(crossover.gapNorm.toFixed(4)),
        // Strategy conditions
        atrMultiplierEntry: 0.6, // Default from strategy
        atrMultiplierUnwind: 0.3,
        rsiEntryLong: 48,
        rsiEntryShort: 52,
        // Check conditions
        gapNormMeetsEntry: gapNorm >= 0.6,
        rsiMeetsLong: rsi >= 48,
        rsiMeetsShort: rsi <= 52,
        wouldEnterLong: crossedUp && gapNorm >= 0.6 && rsi >= 48,
        wouldEnterShort: crossedDown && gapNorm >= 0.6 && rsi <= 52
      };
      
      logData.push(logEntry);
      
      console.log(`\n🎯 ${crossover.type} Crossover at ${crossover.timestamp}:`);
      console.log(`   Price: ₹${crossover.price}`);
      console.log(`   Fast EMA: ${crossover.fastEma.toFixed(2)} (prev: ${crossover.prevFastEma.toFixed(2)})`);
      console.log(`   Slow EMA: ${crossover.slowEma.toFixed(2)} (prev: ${crossover.prevSlowEma.toFixed(2)})`);
      console.log(`   ATR: ${crossover.atr.toFixed(2)}`);
      console.log(`   RSI: ${crossover.rsi.toFixed(2)}`);
      console.log(`   Gap Abs: ${crossover.gapAbs.toFixed(2)}`);
      console.log(`   Gap Norm: ${crossover.gapNorm.toFixed(4)} (ATR multiple)`);
      console.log(`   Strategy Entry Check:`);
      console.log(`     - Gap Norm >= 0.6: ${gapNorm >= 0.6 ? '✅' : '❌'} (${crossover.gapNorm.toFixed(4)})`);
      console.log(`     - RSI Long >= 48: ${rsi >= 48 ? '✅' : '❌'} (${crossover.rsi.toFixed(2)})`);
      console.log(`     - RSI Short <= 52: ${rsi <= 52 ? '✅' : '❌'} (${crossover.rsi.toFixed(2)})`);
      console.log(`     - Would Enter Long: ${(crossedUp && gapNorm >= 0.6 && rsi >= 48) ? '✅' : '❌'}`);
      console.log(`     - Would Enter Short: ${(crossedDown && gapNorm >= 0.6 && rsi <= 52) ? '✅' : '❌'}`);
    }
  }
  
  return { crossovers, logData };
}

async function debugCrossoverATR() {
  try {
    console.log('🔍 Debug Crossover and ATR Analysis');
    console.log('=' .repeat(60));
    
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
            { fast: 5, slow: 15, atr: 14, name: '5/15 EMA, ATR 14' },
            { fast: 3, slow: 9, atr: 14, name: '3/9 EMA, ATR 14' }
          ];
          
          const allLogData = [];
          
          configs.forEach(config => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📊 Configuration: ${config.name}`);
            console.log(`${'='.repeat(60)}`);
            
            const { crossovers, logData } = analyzeCrossovers(
              candles, 
              config.fast, 
              config.slow, 
              config.atr
            );
            
            console.log(`\n📈 Summary for ${config.name}:`);
            console.log(`   Total crossovers: ${crossovers.length}`);
            
            const bullishCrossovers = crossovers.filter(c => c.type === 'BULLISH');
            const bearishCrossovers = crossovers.filter(c => c.type === 'BEARISH');
            
            console.log(`   Bullish crossovers: ${bullishCrossovers.length}`);
            console.log(`   Bearish crossovers: ${bearishCrossovers.length}`);
            
            // Check how many would actually trigger trades
            const wouldEnterLong = logData.filter(l => l.wouldEnterLong).length;
            const wouldEnterShort = logData.filter(l => l.wouldEnterShort).length;
            
            console.log(`   Would enter LONG: ${wouldEnterLong}`);
            console.log(`   Would enter SHORT: ${wouldEnterShort}`);
            console.log(`   Total potential trades: ${wouldEnterLong + wouldEnterShort}`);
            
            // Add config info to log data
            logData.forEach(entry => {
              entry.config = config.name;
              allLogData.push(entry);
            });
          });
          
          // Write detailed log to file
          const logPath = '/Users/rjain/stockplay/stock-play-backend/api/crossover-atr-analysis.json';
          fs.writeFileSync(logPath, JSON.stringify(allLogData, null, 2));
          console.log(`\n📝 Detailed analysis saved to: ${logPath}`);
          
          // Summary statistics
          console.log(`\n📊 Overall Summary:`);
          console.log(`   Total crossover events analyzed: ${allLogData.length}`);
          
          const totalWouldEnter = allLogData.filter(l => l.wouldEnterLong || l.wouldEnterShort).length;
          console.log(`   Total potential trades: ${totalWouldEnter}`);
          
          const avgGapNorm = allLogData.reduce((sum, l) => sum + l.gapNorm, 0) / allLogData.length;
          const avgATR = allLogData.reduce((sum, l) => sum + l.atr, 0) / allLogData.length;
          const avgRSI = allLogData.reduce((sum, l) => sum + l.rsi, 0) / allLogData.length;
          
          console.log(`   Average Gap Norm: ${avgGapNorm.toFixed(4)}`);
          console.log(`   Average ATR: ${avgATR.toFixed(2)}`);
          console.log(`   Average RSI: ${avgRSI.toFixed(2)}`);
          
          // Show problematic crossovers
          const problematicCrossovers = allLogData.filter(l => 
            l.gapNorm < 0.6 || (l.type === 'BULLISH' && l.rsi < 48) || (l.type === 'BEARISH' && l.rsi > 52)
          );
          
          console.log(`\n⚠️  Problematic crossovers (would not trigger trades): ${problematicCrossovers.length}`);
          
          if (problematicCrossovers.length > 0) {
            console.log(`\n🔍 Sample problematic crossovers:`);
            problematicCrossovers.slice(0, 5).forEach((crossover, index) => {
              console.log(`   ${index + 1}. ${crossover.type} at ${crossover.timestamp}`);
              console.log(`      Gap Norm: ${crossover.gapNorm.toFixed(4)} (need >= 0.6)`);
              console.log(`      RSI: ${crossover.rsi.toFixed(2)} (Long need >= 48, Short need <= 52)`);
              console.log(`      ATR: ${crossover.atr.toFixed(2)}`);
            });
          }
          
          console.log('\n✅ Crossover and ATR Analysis Complete!');
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error in analysis:', error.message);
  }
}

debugCrossoverATR();
