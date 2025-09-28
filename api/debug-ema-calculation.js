const { EMA } = require('technicalindicators');

/**
 * Debug EMA calculation to understand why values are 0.00
 */
function debugEMACalculation() {
  console.log('🔍 Debugging EMA calculation...');
  
  // Test with sample data
  const testData = [
    21750.25, 21780.15, 21820.45, 21850.30, 21880.75,
    21910.20, 21940.60, 21970.85, 22000.10, 22030.45,
    22060.80, 22090.15, 22120.50, 22150.85, 22180.20,
    22210.55, 22240.90, 22270.25, 22300.60, 22330.95,
    22360.30, 22390.65, 22420.00, 22450.35, 22480.70
  ];
  
  console.log('📊 Test data length:', testData.length);
  console.log('📊 Sample values:', testData.slice(0, 5), '...', testData.slice(-5));
  
  try {
    // Calculate EMA with different periods
    const ema9 = EMA.calculate({ period: 9, values: testData });
    const ema21 = EMA.calculate({ period: 21, values: testData });
    
    console.log('\n📈 EMA 9 Results:');
    console.log('  Length:', ema9.length);
    console.log('  First 5 values:', ema9.slice(0, 5));
    console.log('  Last 5 values:', ema9.slice(-5));
    console.log('  Latest value:', ema9[ema9.length - 1]);
    
    console.log('\n📈 EMA 21 Results:');
    console.log('  Length:', ema21.length);
    console.log('  First 5 values:', ema21.slice(0, 5));
    console.log('  Last 5 values:', ema21.slice(-5));
    console.log('  Latest value:', ema21[ema21.length - 1]);
    
    // Check for NaN or invalid values
    const ema9Latest = ema9[ema9.length - 1];
    const ema21Latest = ema21[ema21.length - 1];
    
    console.log('\n🔍 Value Analysis:');
    console.log('  EMA 9 latest:', ema9Latest, 'Type:', typeof ema9Latest, 'isNaN:', isNaN(ema9Latest));
    console.log('  EMA 21 latest:', ema21Latest, 'Type:', typeof ema21Latest, 'isNaN:', isNaN(ema21Latest));
    
    if (ema9Latest === 0 || ema21Latest === 0) {
      console.log('❌ EMA values are 0 - this is the problem!');
    } else {
      console.log('✅ EMA values look correct');
    }
    
  } catch (error) {
    console.error('❌ EMA calculation error:', error);
  }
}

// Run the debug
debugEMACalculation();
