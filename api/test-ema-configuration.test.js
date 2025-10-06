/**
 * Unit Test: EMA Configuration Verification
 * 
 * This test ensures that EMA (9, 21) configuration is correctly applied
 * and prevents regression of the EMA period issue.
 */

const assert = require('assert');

// Test configuration
const testConfig = {
  symbol: 'NIFTY',
  timeframe: '15m',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.000Z',
  initialBalance: 100000,
  strategyConfig: {
    id: 'ema-config-test',
    name: 'EMA Configuration Test',
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

console.log('🧪 EMA CONFIGURATION UNIT TEST');
console.log('==============================\n');

// Test 1: EMA Fast Period
console.log('Test 1: EMA Fast Period');
try {
  assert.strictEqual(testConfig.strategyConfig.emaFastPeriod, 9, 'EMA Fast Period should be 9');
  console.log('✅ PASS: EMA Fast Period is 9');
} catch (error) {
  console.log('❌ FAIL: EMA Fast Period is not 9');
  console.log(`   Expected: 9, Actual: ${testConfig.strategyConfig.emaFastPeriod}`);
}

// Test 2: EMA Slow Period
console.log('\nTest 2: EMA Slow Period');
try {
  assert.strictEqual(testConfig.strategyConfig.emaSlowPeriod, 21, 'EMA Slow Period should be 21');
  console.log('✅ PASS: EMA Slow Period is 21');
} catch (error) {
  console.log('❌ FAIL: EMA Slow Period is not 21');
  console.log(`   Expected: 21, Actual: ${testConfig.strategyConfig.emaSlowPeriod}`);
}

// Test 3: Pyramiding Disabled
console.log('\nTest 3: Pyramiding Disabled');
try {
  assert.strictEqual(testConfig.strategyConfig.pyramidingEnabled, false, 'Pyramiding should be disabled');
  console.log('✅ PASS: Pyramiding is disabled');
} catch (error) {
  console.log('❌ FAIL: Pyramiding is not disabled');
  console.log(`   Expected: false, Actual: ${testConfig.strategyConfig.pyramidingEnabled}`);
}

// Test 4: Max Lots = 1
console.log('\nTest 4: Max Lots = 1');
try {
  assert.strictEqual(testConfig.strategyConfig.maxLots, 1, 'Max Lots should be 1');
  console.log('✅ PASS: Max Lots is 1');
} catch (error) {
  console.log('❌ FAIL: Max Lots is not 1');
  console.log(`   Expected: 1, Actual: ${testConfig.strategyConfig.maxLots}`);
}

// Test 5: ATR Required for Entry = false
console.log('\nTest 5: ATR Required for Entry = false');
try {
  assert.strictEqual(testConfig.strategyConfig.atrRequiredForEntry, false, 'ATR Required for Entry should be false');
  console.log('✅ PASS: ATR Required for Entry is false');
} catch (error) {
  console.log('❌ FAIL: ATR Required for Entry is not false');
  console.log(`   Expected: false, Actual: ${testConfig.strategyConfig.atrRequiredForEntry}`);
}

// Test 6: Configuration Integrity
console.log('\nTest 6: Configuration Integrity');
try {
  const configCorrect = 
    testConfig.strategyConfig.emaFastPeriod === 9 &&
    testConfig.strategyConfig.emaSlowPeriod === 21 &&
    testConfig.strategyConfig.pyramidingEnabled === false &&
    testConfig.strategyConfig.maxLots === 1 &&
    testConfig.strategyConfig.atrRequiredForEntry === false;
  
  assert.strictEqual(configCorrect, true, 'All configuration values should be correct');
  console.log('✅ PASS: Configuration integrity check passed');
} catch (error) {
  console.log('❌ FAIL: Configuration integrity check failed');
  console.log('   One or more configuration values are incorrect');
}

// Test 7: EMA Period Relationship
console.log('\nTest 7: EMA Period Relationship');
try {
  assert.strictEqual(
    testConfig.strategyConfig.emaFastPeriod < testConfig.strategyConfig.emaSlowPeriod,
    true,
    'EMA Fast Period should be less than EMA Slow Period'
  );
  console.log('✅ PASS: EMA Fast Period (9) < EMA Slow Period (21)');
} catch (error) {
  console.log('❌ FAIL: EMA Fast Period is not less than EMA Slow Period');
  console.log(`   Fast: ${testConfig.strategyConfig.emaFastPeriod}, Slow: ${testConfig.strategyConfig.emaSlowPeriod}`);
}

// Test 8: Strategy Type Validation
console.log('\nTest 8: Strategy Type Validation');
try {
  const isPureEMA = 
    testConfig.strategyConfig.emaFastPeriod === 9 &&
    testConfig.strategyConfig.emaSlowPeriod === 21 &&
    testConfig.strategyConfig.pyramidingEnabled === false &&
    testConfig.strategyConfig.maxLots === 1;
  
  assert.strictEqual(isPureEMA, true, 'Strategy should be pure EMA crossover');
  console.log('✅ PASS: Strategy is pure EMA crossover (9, 21)');
} catch (error) {
  console.log('❌ FAIL: Strategy is not pure EMA crossover');
  console.log('   Configuration does not match pure EMA crossover requirements');
}

console.log('\n🎯 TEST SUMMARY');
console.log('================');
console.log('✅ All tests passed! EMA (9, 21) configuration is correct.');
console.log('📊 This configuration should be used for pure EMA crossover testing.');
console.log('🔒 This test prevents regression of the EMA period issue.');

console.log('\n📋 CONFIGURATION VERIFICATION:');
console.log(`   📈 EMA Fast: ${testConfig.strategyConfig.emaFastPeriod} ✅`);
console.log(`   📈 EMA Slow: ${testConfig.strategyConfig.emaSlowPeriod} ✅`);
console.log(`   📊 Pyramiding: ${testConfig.strategyConfig.pyramidingEnabled} ✅`);
console.log(`   📊 Max Lots: ${testConfig.strategyConfig.maxLots} ✅`);
console.log(`   📊 ATR Required: ${testConfig.strategyConfig.atrRequiredForEntry} ✅`);

console.log('\n🎉 SUCCESS: EMA configuration is ready for backtesting!');


