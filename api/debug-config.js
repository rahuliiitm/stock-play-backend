// Simple configuration debug script
const config = {
  symbol: 'NIFTY',
  timeframe: '15m',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.000Z',
  initialBalance: 100000,
  strategyConfig: {
    id: 'debug-config-test',
    name: 'Debug Configuration Test',
    symbol: 'NIFTY',
    timeframe: '15m',
    emaFastPeriod: 9,   // As requested
    emaSlowPeriod: 21, // As requested
    atrPeriod: 14,
    atrDeclineThreshold: 0.08,
    atrExpansionThreshold: 0.002,
    atrRequiredForEntry: false,
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
    maxLots: 1,
    pyramidingEnabled: false,
    exitMode: 'FIFO',
    misExitTime: null,
    cncExitTime: null,
    maxConsecutiveLosses: 3,
    maxDrawdownStop: 0.1,
    positionSizingMode: 'CONSERVATIVE',
  },
};

console.log('🔍 DEBUGGING CONFIGURATION');
console.log('==========================\n');

console.log('📊 Configuration being passed:');
console.log(JSON.stringify(config, null, 2));

console.log('\n🎯 EMA Configuration Check:');
console.log(`   📈 EMA Fast: ${config.strategyConfig.emaFastPeriod} (Expected: 9)`);
console.log(`   📈 EMA Slow: ${config.strategyConfig.emaSlowPeriod} (Expected: 21)`);
console.log(`   📊 Pyramiding: ${config.strategyConfig.pyramidingEnabled} (Expected: false)`);
console.log(`   📊 Max Lots: ${config.strategyConfig.maxLots} (Expected: 1)`);

const emaCorrect = config.strategyConfig.emaFastPeriod === 9 && config.strategyConfig.emaSlowPeriod === 21;
const pyramidingCorrect = config.strategyConfig.pyramidingEnabled === false;
const maxLotsCorrect = config.strategyConfig.maxLots === 1;

console.log('\n✅ Configuration Verification:');
console.log(`   📊 EMA (9, 21): ${emaCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
console.log(`   📊 Pyramiding Disabled: ${pyramidingCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
console.log(`   📊 Max Lots = 1: ${maxLotsCorrect ? '✅ CORRECT' : '❌ WRONG'}`);

if (emaCorrect && pyramidingCorrect && maxLotsCorrect) {
  console.log('\n🎉 SUCCESS: Configuration is correct!');
  console.log('📊 The issue must be elsewhere in the system.');
} else {
  console.log('\n❌ FAILURE: Configuration has issues!');
  console.log('📊 This needs to be fixed before proceeding.');
}


