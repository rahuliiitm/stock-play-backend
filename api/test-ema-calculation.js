const { EMA } = require('technicalindicators');

// Test EMA calculation
function testEMACalculation() {
  console.log('🧮 Testing EMA Calculation...\n');
  
  // Create a simple test dataset
  const testData = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120];
  
  console.log('📊 Test Data (first 10 values):', testData.slice(0, 10).join(', '));
  
  // Calculate EMAs using technicalindicators
  const ema9 = EMA.calculate({
    period: 9,
    values: testData,
  });
  
  const ema21 = EMA.calculate({
    period: 21,
    values: testData,
  });
  
  console.log(`\n📈 EMA 9 length: ${ema9.length}`);
  console.log(`📈 EMA 21 length: ${ema21.length}`);
  console.log(`📊 Original data length: ${testData.length}`);
  
  if (ema9.length > 0 && ema21.length > 0) {
    console.log('\n📈 EMA 9 values (last 5):', ema9.slice(-5).map(v => v.toFixed(2)).join(', '));
    console.log('📈 EMA 21 values (last 5):', ema21.slice(-5).map(v => v.toFixed(2)).join(', '));
    
    // Test crossover detection logic
    const fast = ema9[ema9.length - 1];
    const fastPrev = ema9[ema9.length - 2] ?? fast;
    const slow = ema21[ema21.length - 1];
    const slowPrev = ema21[ema21.length - 2] ?? slow;
    
    console.log('\n🔍 Crossover Detection Test:');
    console.log(`   Fast Current: ${fast.toFixed(2)}`);
    console.log(`   Fast Previous: ${fastPrev.toFixed(2)}`);
    console.log(`   Slow Current: ${slow.toFixed(2)}`);
    console.log(`   Slow Previous: ${slowPrev.toFixed(2)}`);
    
    const crossedUp = fastPrev <= slowPrev && fast > slow;
    const crossedDown = fastPrev >= slowPrev && fast < slow;
    
    console.log(`   Crossed Up: ${crossedUp}`);
    console.log(`   Crossed Down: ${crossedDown}`);
    
    // Check if fastPrev === fast (which would prevent crossovers)
    console.log(`\n⚠️  Potential Issue Check:`);
    console.log(`   fastPrev === fast: ${fastPrev === fast}`);
    console.log(`   slowPrev === slow: ${slowPrev === slow}`);
    
    if (fastPrev === fast || slowPrev === slow) {
      console.log('   ❌ ISSUE: Previous values are same as current - no crossovers possible!');
    } else {
      console.log('   ✅ Previous values are different - crossovers possible');
    }
  } else {
    console.log('❌ EMA calculation failed');
  }
}

testEMACalculation();


