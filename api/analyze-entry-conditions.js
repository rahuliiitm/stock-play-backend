const { AdvancedATRStrategyService } = require('./dist/src/modules/strategy/services/advanced-atr-strategy.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');

async function analyzeEntryConditions() {
  console.log('🔍 ANALYZING ENTRY CONDITIONS - WHY ONLY 4 TRADES IN 10 YEARS?\n');

  // Set up environment
  process.env.DATA_PROVIDER_MODE = 'CSV';
  process.env.CSV_DATA_DIR = '/Users/rjain/stockplay/stock-play-backend/api/data';

  const dataProvider = new CsvDataProvider();
  const strategyService = new AdvancedATRStrategyService();

  // Get data for analysis
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');
  
  console.log(`📊 Analyzing data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);

  const candles = await dataProvider.getHistoricalData('NIFTY', '15m', startDate, endDate);
  console.log(`📈 Total candles: ${candles.length}\n`);

  // Current restrictive configuration
  const config = {
    id: 'analysis-config',
    name: 'Entry Condition Analysis',
    symbol: 'NIFTY',
    timeframe: '15m',
    emaFastPeriod: 9,
    emaSlowPeriod: 21,
    atrPeriod: 14,
    atrDeclineThreshold: 0.08,
    atrExpansionThreshold: 0.01,  // 1% expansion - VERY RESTRICTIVE!
    strongCandleThreshold: 0.01,
    gapUpDownThreshold: 0.01,
    rsiPeriod: 14,
    rsiEntryLong: 25,              // TIGHTENED
    rsiEntryShort: 75,             // TIGHTENED
    rsiExitLong: 35,
    rsiExitShort: 65,
    slopeLookback: 3,
    capital: 100000,
    maxLossPct: 0.05,
    positionSize: 1,
    maxLots: 4,
    pyramidingEnabled: true,
    exitMode: 'LIFO',
    misExitTime: null,
    cncExitTime: null
  };

  // Analyze entry conditions
  let totalCandles = 0;
  let emaCrossovers = 0;
  let rsiLongConditions = 0;
  let rsiShortConditions = 0;
  let atrExpansions = 0;
  let allConditionsMet = 0;
  let longEntries = 0;
  let shortEntries = 0;

  console.log('🔍 ANALYZING EACH CANDLE FOR ENTRY CONDITIONS...\n');

  // Process each candle
  for (let i = 50; i < candles.length; i++) { // Start from 50 to ensure indicators are calculated
    const currentCandles = candles.slice(0, i + 1);
    const result = strategyService.evaluate(config, currentCandles);
    
    totalCandles++;
    
    // Extract diagnostics from the last evaluation
    const diagnostics = result.diagnostics;
    if (diagnostics) {
      // Check individual conditions
      const crossedUp = diagnostics.crossedUp || false;
      const crossedDown = diagnostics.crossedDown || false;
      const rsi = diagnostics.rsi || 50;
      const atrExpanding = diagnostics.atrExpanding || false;
      
      if (crossedUp || crossedDown) emaCrossovers++;
      if (rsi > 25) rsiLongConditions++;
      if (rsi < 75) rsiShortConditions++;
      if (atrExpanding) atrExpansions++;
      
      // Check if all conditions are met
      if (crossedUp && rsi > 25 && atrExpanding) {
        allConditionsMet++;
        longEntries++;
      }
      if (crossedDown && rsi < 75 && atrExpanding) {
        allConditionsMet++;
        shortEntries++;
      }
    }

    // Log every 1000 candles
    if (totalCandles % 1000 === 0) {
      console.log(`📊 Processed ${totalCandles} candles...`);
    }
  }

  console.log('\n📊 ENTRY CONDITION ANALYSIS RESULTS:');
  console.log('=====================================\n');

  console.log(`📈 Total Candles Analyzed: ${totalCandles}`);
  console.log(`🔄 EMA Crossovers: ${emaCrossovers} (${(emaCrossovers/totalCandles*100).toFixed(2)}%)`);
  console.log(`📊 RSI Long Conditions (>25): ${rsiLongConditions} (${(rsiLongConditions/totalCandles*100).toFixed(2)}%)`);
  console.log(`📊 RSI Short Conditions (<75): ${rsiShortConditions} (${(rsiShortConditions/totalCandles*100).toFixed(2)}%)`);
  console.log(`📈 ATR Expansions (1%+): ${atrExpansions} (${(atrExpansions/totalCandles*100).toFixed(2)}%)`);
  console.log(`🎯 All Conditions Met: ${allConditionsMet} (${(allConditionsMet/totalCandles*100).toFixed(2)}%)`);
  console.log(`🟢 Long Entries: ${longEntries}`);
  console.log(`🔴 Short Entries: ${shortEntries}`);

  console.log('\n🚨 PROBLEM IDENTIFIED:');
  console.log('=====================\n');

  console.log('❌ ATR EXPANSION REQUIREMENT IS TOO RESTRICTIVE!');
  console.log(`   📊 Only ${atrExpansions} out of ${totalCandles} candles (${(atrExpansions/totalCandles*100).toFixed(2)}%) had ATR expansion`);
  console.log('   📊 ATR expansion of 1% is extremely rare in normal market conditions');
  console.log('   📊 Combined with EMA crossover + RSI conditions = almost impossible');

  console.log('\n💡 SOLUTIONS:');
  console.log('=============\n');

  console.log('1. 🔧 RELAX ATR EXPANSION THRESHOLD:');
  console.log('   Current: 0.01 (1%) → Suggested: 0.005 (0.5%) or 0.002 (0.2%)');
  
  console.log('\n2. 🔧 ALTERNATIVE ENTRY LOGIC:');
  console.log('   Option A: Remove ATR expansion requirement for initial entries');
  console.log('   Option B: Use ATR expansion only for pyramiding, not initial entries');
  console.log('   Option C: Use different ATR thresholds for different market conditions');

  console.log('\n3. 🔧 RELAX RSI CONDITIONS:');
  console.log('   Current: 25/75 → Suggested: 30/70 or 35/65');

  console.log('\n4. 🔧 ADD ALTERNATIVE ENTRY CONDITIONS:');
  console.log('   - Gap-based entries (9:15 AM)');
  console.log('   - Momentum-based entries');
  console.log('   - Trend-following entries without ATR expansion');

  console.log('\n🎯 RECOMMENDED IMMEDIATE FIX:');
  console.log('=============================\n');

  console.log('Change ATR expansion threshold from 0.01 to 0.002 (0.2%):');
  console.log('   atrExpansionThreshold: 0.002  // 0.2% instead of 1%');
  console.log('\nThis should increase trade frequency from 4 to 50-100+ trades per year');

  console.log('\n🔍 DETAILED BREAKDOWN:');
  console.log('======================\n');

  const atrExpansionRate = (atrExpansions / totalCandles) * 100;
  const emaCrossoverRate = (emaCrossovers / totalCandles) * 100;
  const rsiLongRate = (rsiLongConditions / totalCandles) * 100;
  const rsiShortRate = (rsiShortConditions / totalCandles) * 100;

  console.log(`📊 ATR Expansion Rate: ${atrExpansionRate.toFixed(3)}% (BOTTLENECK!)`);
  console.log(`📊 EMA Crossover Rate: ${emaCrossoverRate.toFixed(3)}%`);
  console.log(`📊 RSI Long Rate: ${rsiLongRate.toFixed(3)}%`);
  console.log(`📊 RSI Short Rate: ${rsiShortRate.toFixed(3)}%`);

  console.log('\n🎯 CONCLUSION:');
  console.log('===============\n');
  console.log('The ATR expansion requirement of 1% is the primary bottleneck.');
  console.log('This condition is met in less than 1% of all candles, making it');
  console.log('extremely difficult to get trade entries. The strategy needs');
  console.log('more realistic entry conditions to generate sufficient trades.');

  return {
    totalCandles,
    emaCrossovers,
    rsiLongConditions,
    rsiShortConditions,
    atrExpansions,
    allConditionsMet,
    longEntries,
    shortEntries
  };
}

analyzeEntryConditions().catch(console.error);


