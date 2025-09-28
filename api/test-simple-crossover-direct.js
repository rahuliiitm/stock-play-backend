#!/usr/bin/env node

/**
 * Direct Simple EMA Crossover Test
 * 
 * This script directly tests the simple EMA crossover logic
 * without going through the complex strategy framework.
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

// Simple crossover detection
function detectCrossovers(fastEma, slowEma) {
  const crossovers = [];
  
  for (let i = 1; i < fastEma.length; i++) {
    const prevFast = fastEma[i - 1];
    const prevSlow = slowEma[i - 1];
    const currentFast = fastEma[i];
    const currentSlow = slowEma[i];
    
    // Bullish crossover: fast crosses above slow
    if (prevFast <= prevSlow && currentFast > currentSlow) {
      crossovers.push({
        type: 'BULLISH',
        index: i,
        fastEma: currentFast,
        slowEma: currentSlow,
        prevFastEma: prevFast,
        prevSlowEma: prevSlow
      });
    }
    
    // Bearish crossover: fast crosses below slow
    if (prevFast >= prevSlow && currentFast < currentSlow) {
      crossovers.push({
        type: 'BEARISH',
        index: i,
        fastEma: currentFast,
        slowEma: currentSlow,
        prevFastEma: prevFast,
        prevSlowEma: prevSlow
      });
    }
  }
  
  return crossovers;
}

async function testSimpleCrossoverDirect() {
  try {
    console.log('🎯 Direct Simple EMA Crossover Test');
    console.log('=' .repeat(50));
    
    const dataPath = '/Users/rjain/stockplay/stock-play-backend/api/data/NIFTY_15m.csv';
    
    console.log(`📁 Data file: ${dataPath}`);
    console.log(`📁 File exists: ${fs.existsSync(dataPath)}`);
    
    if (!fs.existsSync(dataPath)) {
      console.error('❌ Data file not found!');
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
          
          // Test with different EMA periods
          const testConfigs = [
            { fast: 9, slow: 21, name: '9/21 EMA' },
            { fast: 12, slow: 26, name: '12/26 EMA' },
            { fast: 5, slow: 15, name: '5/15 EMA' },
            { fast: 3, slow: 9, name: '3/9 EMA' }
          ];
          
          console.log('\n📊 Testing EMA Crossovers:');
          
          testConfigs.forEach(config => {
            console.log(`\n🔍 Testing ${config.name}...`);
            
            const fastEma = calculateEMA(candles, config.fast);
            const slowEma = calculateEMA(candles, config.slow);
            
            console.log(`   Fast EMA (${config.fast}): ${fastEma.length} values`);
            console.log(`   Slow EMA (${config.slow}): ${slowEma.length} values`);
            
            if (fastEma.length > 0 && slowEma.length > 0) {
              const crossovers = detectCrossovers(fastEma, slowEma);
              
              console.log(`   📈 Total crossovers: ${crossovers.length}`);
              
              const bullishCrossovers = crossovers.filter(c => c.type === 'BULLISH');
              const bearishCrossovers = crossovers.filter(c => c.type === 'BEARISH');
              
              console.log(`   🟢 Bullish crossovers: ${bullishCrossovers.length}`);
              console.log(`   🔴 Bearish crossovers: ${bearishCrossovers.length}`);
              
              if (crossovers.length > 0) {
                console.log(`   📅 First crossover: ${new Date(candles[crossovers[0].index].timestamp).toISOString()}`);
                console.log(`   📅 Last crossover: ${new Date(candles[crossovers[crossovers.length - 1].index].timestamp).toISOString()}`);
                
                // Show first few crossovers
                console.log(`   📋 Sample crossovers:`);
                crossovers.slice(0, 3).forEach((crossover, index) => {
                  const candle = candles[crossover.index];
                  console.log(`      ${index + 1}. ${crossover.type} at ${new Date(candle.timestamp).toISOString()} - Price: ₹${candle.close}, Fast: ${crossover.fastEma.toFixed(2)}, Slow: ${crossover.slowEma.toFixed(2)}`);
                });
              } else {
                console.log(`   ⚠️  No crossovers detected with ${config.name}`);
              }
            } else {
              console.log(`   ❌ Failed to calculate EMAs for ${config.name}`);
            }
          });
          
          // Test with a specific date range
          console.log('\n🔍 Testing with specific date range (July 2025)...');
          const julyCandles = candles.filter(c => {
            const date = new Date(c.timestamp);
            return date.getFullYear() === 2025 && date.getMonth() === 6; // July = month 6
          });
          
          if (julyCandles.length > 0) {
            console.log(`   📅 July 2025 candles: ${julyCandles.length}`);
            
            const fastEma = calculateEMA(julyCandles, 9);
            const slowEma = calculateEMA(julyCandles, 21);
            const crossovers = detectCrossovers(fastEma, slowEma);
            
            console.log(`   📈 July crossovers: ${crossovers.length}`);
            
            if (crossovers.length > 0) {
              crossovers.forEach((crossover, index) => {
                const candle = julyCandles[crossover.index];
                console.log(`      ${index + 1}. ${crossover.type} at ${new Date(candle.timestamp).toISOString()} - Price: ₹${candle.close}`);
              });
            }
          }
          
          console.log('\n✅ Direct EMA Crossover Test Complete!');
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error in direct test:', error.message);
  }
}

testSimpleCrossoverDirect();
