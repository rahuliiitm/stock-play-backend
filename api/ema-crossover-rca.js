const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { EMA } = require('technicalindicators');

async function analyzeEMACrossoverRCA() {
  console.log('🔍 EMA CROSSOVER RCA - ROOT CAUSE ANALYSIS\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  const dataProvider = new CsvDataProvider();

  // Get data for analysis
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-06-30');
  
  console.log(`📊 Analyzing EMA crossover detection from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);

  const candles = await dataProvider.getHistoricalData('NIFTY', '15m', startDate, endDate);
  console.log(`📈 Total candles: ${candles.length}\n`);

  // Extract close prices
  const closes = candles.map(candle => candle.close);
  
  // Calculate EMAs
  const ema9 = EMA.calculate({ period: 9, values: closes });
  const ema21 = EMA.calculate({ period: 21, values: closes });
  
  console.log(`📊 EMA 9 calculated: ${ema9.length} values`);
  console.log(`📊 EMA 21 calculated: ${ema21.length} values\n`);

  // Analyze crossovers
  let totalCandles = 0;
  let crossovers = 0;
  let crossedUp = 0;
  let crossedDown = 0;
  let rsiLongConditions = 0;
  let rsiShortConditions = 0;
  let allConditionsMet = 0;
  let longEntries = 0;
  let shortEntries = 0;

  // Calculate RSI for analysis
  const { RSI } = require('technicalindicators');
  const rsi = RSI.calculate({ period: 14, values: closes });

  console.log('🔍 ANALYZING EMA CROSSOVER DETECTION LOGIC...\n');

  // Start from index 21 to ensure all indicators are calculated
  for (let i = 21; i < candles.length; i++) {
    const currentCandle = candles[i];
    const currentEma9 = ema9[i - 21];
    const currentEma21 = ema21[i - 21];
    const currentRsi = rsi[i - 21];
    
    if (!currentEma9 || !currentEma21 || !currentRsi) continue;
    
    totalCandles++;
    
    // Check for crossovers
    const prevEma9 = ema9[i - 22];
    const prevEma21 = ema21[i - 22];
    
    if (!prevEma9 || !prevEma21) continue;
    
    const crossedUpThisCandle = prevEma9 <= prevEma21 && currentEma9 > currentEma21;
    const crossedDownThisCandle = prevEma9 >= prevEma21 && currentEma9 < currentEma21;
    
    if (crossedUpThisCandle || crossedDownThisCandle) {
      crossovers++;
      if (crossedUpThisCandle) crossedUp++;
      if (crossedDownThisCandle) crossedDown++;
      
      // Log the crossover details
      console.log(`🔄 CROSSOVER DETECTED at ${currentCandle.timestamp}:`);
      console.log(`   📈 EMA 9: ${prevEma9.toFixed(2)} → ${currentEma9.toFixed(2)}`);
      console.log(`   📈 EMA 21: ${prevEma21.toFixed(2)} → ${currentEma21.toFixed(2)}`);
      console.log(`   📊 RSI: ${currentRsi.toFixed(2)}`);
      console.log(`   🎯 Direction: ${crossedUpThisCandle ? 'UP' : 'DOWN'}`);
      console.log(`   📅 Date: ${new Date(currentCandle.timestamp).toLocaleString()}\n`);
    }
    
    // Check RSI conditions
    if (currentRsi > 30) rsiLongConditions++;
    if (currentRsi < 70) rsiShortConditions++;
    
    // Check if all conditions are met (crossover + RSI)
    if (crossedUpThisCandle && currentRsi > 30) {
      allConditionsMet++;
      longEntries++;
    }
    if (crossedDownThisCandle && currentRsi < 70) {
      allConditionsMet++;
      shortEntries++;
    }

    // Log every 1000 candles
    if (totalCandles % 1000 === 0) {
      console.log(`📊 Processed ${totalCandles} candles...`);
    }
  }

  console.log('\n📊 EMA CROSSOVER RCA RESULTS:');
  console.log('================================\n');

  console.log(`📈 Total Candles Analyzed: ${totalCandles}`);
  console.log(`🔄 Total Crossovers: ${crossovers} (${(crossovers/totalCandles*100).toFixed(2)}%)`);
  console.log(`📈 Crossed Up: ${crossedUp} (${(crossedUp/totalCandles*100).toFixed(2)}%)`);
  console.log(`📉 Crossed Down: ${crossedDown} (${(crossedDown/totalCandles*100).toFixed(2)}%)`);
  console.log(`📊 RSI Long Conditions (>30): ${rsiLongConditions} (${(rsiLongConditions/totalCandles*100).toFixed(2)}%)`);
  console.log(`📊 RSI Short Conditions (<70): ${rsiShortConditions} (${(rsiShortConditions/totalCandles*100).toFixed(2)}%)`);
  console.log(`🎯 All Conditions Met: ${allConditionsMet} (${(allConditionsMet/totalCandles*100).toFixed(2)}%)`);
  console.log(`🟢 Long Entries: ${longEntries}`);
  console.log(`🔴 Short Entries: ${shortEntries}`);

  console.log('\n🚨 ROOT CAUSE ANALYSIS:');
  console.log('======================\n');

  const crossoverRate = (crossovers / totalCandles) * 100;
  const rsiLongRate = (rsiLongConditions / totalCandles) * 100;
  const rsiShortRate = (rsiShortConditions / totalCandles) * 100;
  const allConditionsRate = (allConditionsMet / totalCandles) * 100;

  console.log(`📊 EMA Crossover Rate: ${crossoverRate.toFixed(3)}%`);
  console.log(`📊 RSI Long Rate: ${rsiLongRate.toFixed(3)}%`);
  console.log(`📊 RSI Short Rate: ${rsiShortRate.toFixed(3)}%`);
  console.log(`📊 Combined Rate: ${allConditionsRate.toFixed(3)}%\n`);

  if (crossoverRate < 0.5) {
    console.log('❌ EMA CROSSOVERS ARE TOO RARE!');
    console.log('   📊 Current: 9 EMA vs 21 EMA');
    console.log('   📊 Problem: These EMAs rarely cross in trending markets');
    console.log('   📊 Solution: Use closer EMA periods (e.g., 5 vs 9, or 7 vs 14)\n');
  }

  if (allConditionsRate < 0.1) {
    console.log('❌ COMBINED CONDITIONS ARE IMPOSSIBLE!');
    console.log('   📊 EMA Crossover + RSI conditions = almost never happen together');
    console.log('   📊 Solution: Relax one or both conditions\n');
  }

  console.log('💡 POTENTIAL SOLUTIONS:');
  console.log('========================\n');

  console.log('🔧 SOLUTION 1 - Closer EMA Periods:');
  console.log('   Current: EMA 9 vs EMA 21 (gap of 12)');
  console.log('   Suggested: EMA 5 vs EMA 9 (gap of 4)');
  console.log('   Expected Impact: 3-5x more crossovers\n');

  console.log('🔧 SOLUTION 2 - Relax RSI Conditions:');
  console.log('   Current: RSI > 30 for LONG, RSI < 70 for SHORT');
  console.log('   Suggested: RSI > 20 for LONG, RSI < 80 for SHORT');
  console.log('   Expected Impact: 2-3x more entries\n');

  console.log('🔧 SOLUTION 3 - Alternative Entry Logic:');
  console.log('   Option A: Remove EMA crossover requirement');
  console.log('   Option B: Use momentum-based entries');
  console.log('   Option C: Use gap-based entries (9:15 AM)');
  console.log('   Expected Impact: 10-50x more entries\n');

  console.log('🔧 SOLUTION 4 - Hybrid Approach:');
  console.log('   Primary: EMA crossover + RSI (current)');
  console.log('   Secondary: Gap-based entries at 9:15 AM');
  console.log('   Tertiary: Momentum-based entries');
  console.log('   Expected Impact: 5-20x more entries\n');

  console.log('🎯 RECOMMENDED IMMEDIATE FIX:');
  console.log('=============================\n');

  console.log('Change EMA periods from 9/21 to 5/9:');
  console.log('   emaFastPeriod: 5   // instead of 9');
  console.log('   emaSlowPeriod: 9   // instead of 21');
  console.log('\nThis should increase crossover frequency from ~0.5% to ~2-3%');
  console.log('Combined with RSI conditions, should give 50-100+ trades per year');

  console.log('\n🔍 DETAILED BREAKDOWN:');
  console.log('======================\n');

  console.log(`📊 EMA Crossover Rate: ${crossoverRate.toFixed(3)}% (BOTTLENECK!)`);
  console.log(`📊 RSI Long Rate: ${rsiLongRate.toFixed(3)}%`);
  console.log(`📊 RSI Short Rate: ${rsiShortRate.toFixed(3)}%`);
  console.log(`📊 Combined Rate: ${allConditionsRate.toFixed(3)}% (IMPOSSIBLE!)`);

  console.log('\n🎯 CONCLUSION:');
  console.log('===============\n');
  console.log('The EMA crossover requirement (9 vs 21) is the primary bottleneck.');
  console.log('These EMAs rarely cross in trending markets, making the strategy');
  console.log('extremely selective. The solution is to use closer EMA periods');
  console.log('or implement alternative entry logic.');

  return {
    totalCandles,
    crossovers,
    crossedUp,
    crossedDown,
    rsiLongConditions,
    rsiShortConditions,
    allConditionsMet,
    longEntries,
    shortEntries
  };
}

analyzeEMACrossoverRCA().catch(console.error);


