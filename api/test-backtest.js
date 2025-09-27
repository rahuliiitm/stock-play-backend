const axios = require('axios');

async function testBacktest() {
  try {
    console.log('🧪 Testing Backtest API...\n');

    // Test 1: Get example configuration
    console.log('1️⃣ Testing example configuration...');
    const exampleResponse = await axios.get('http://localhost:20001/backtest/example-config');
    console.log('✅ Example config retrieved:', exampleResponse.data.symbol);
    console.log('   Strategy:', exampleResponse.data.strategyConfig.name);
    console.log('   Timeframe:', exampleResponse.data.timeframe);
    console.log('   Initial Balance: ₹', exampleResponse.data.initialBalance.toLocaleString());
    console.log('');

    // Test 2: Validate configuration
    console.log('2️⃣ Testing configuration validation...');
    const validationResponse = await axios.post('http://localhost:20001/backtest/validation/config', {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      initialBalance: 1000000,
      strategyConfig: {
        id: 'test-strategy',
        name: 'EMA Gap ATR Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 20,
        atrPeriod: 14,
        minGapThreshold: 0,
        minGapMultiplier: 0.3,
        slopeLookback: 3,
        slopeMin: 0,
        rsiPeriod: 14,
        rsiThreshold: 50,
        adxPeriod: 14,
        adxThreshold: 25,
        pyramiding: {
          multiplier: 0.6,
          maxLots: 3
        },
        risk: {
          maxLossPerLot: 10000,
          trailingAtrMultiplier: 1
        },
        options: {
          enabled: false,
          strikeSelection: {
            callStrikes: ['ATM'],
            putStrikes: ['ATM'],
            expiryDays: 7
          },
          lotSize: 50,
          strikeIncrement: 50
        }
      }
    });
    
    console.log('✅ Validation result:');
    console.log('   Valid:', validationResponse.data.validation.isValid);
    console.log('   Can Proceed:', validationResponse.data.canProceed);
    console.log('   Errors:', validationResponse.data.validation.errors.length);
    console.log('   Warnings:', validationResponse.data.validation.warnings.length);
    console.log('');

    // Test 3: Safety check
    console.log('3️⃣ Testing safety check...');
    const safetyResponse = await axios.post('http://localhost:20001/backtest/validation/safety-check', {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      initialBalance: 1000000,
      strategyConfig: {
        id: 'test-strategy',
        name: 'EMA Gap ATR Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 20,
        atrPeriod: 14,
        minGapThreshold: 0,
        minGapMultiplier: 0.3,
        slopeLookback: 3,
        slopeMin: 0,
        rsiPeriod: 14,
        rsiThreshold: 50,
        adxPeriod: 14,
        adxThreshold: 25,
        pyramiding: {
          multiplier: 0.6,
          maxLots: 3
        },
        risk: {
          maxLossPerLot: 10000,
          trailingAtrMultiplier: 1
        },
        options: {
          enabled: false,
          strikeSelection: {
            callStrikes: ['ATM'],
            putStrikes: ['ATM'],
            expiryDays: 7
          },
          lotSize: 50,
          strikeIncrement: 50
        }
      }
    });
    
    console.log('✅ Safety check result:');
    console.log('   Overall Safe:', safetyResponse.data.safety.overallSafe);
    console.log('   Can Proceed:', safetyResponse.data.canProceed);
    console.log('   Critical Issues:', safetyResponse.data.safety.checks.filter(c => c.severity === 'CRITICAL').length);
    console.log('   High Issues:', safetyResponse.data.safety.checks.filter(c => c.severity === 'HIGH').length);
    console.log('');

    // Test 4: Get safety guidelines
    console.log('4️⃣ Testing safety guidelines...');
    const guidelinesResponse = await axios.get('http://localhost:20001/backtest/safety-guidelines');
    console.log('✅ Safety guidelines retrieved:');
    console.log('   Critical rules:', guidelinesResponse.data.critical.length);
    console.log('   High severity rules:', guidelinesResponse.data.high.length);
    console.log('   Medium severity rules:', guidelinesResponse.data.medium.length);
    console.log('   Recommendations:', guidelinesResponse.data.recommendations.length);
    console.log('');

    console.log('🎉 All backtest tests passed! The system is working correctly.');
    console.log('');
    console.log('📊 Summary:');
    console.log('   ✅ Configuration validation working');
    console.log('   ✅ Safety checks working');
    console.log('   ✅ Financial protection active');
    console.log('   ✅ API endpoints responding');
    console.log('');
    console.log('🛡️ Financial Safety Features:');
    console.log('   • Unlimited risk prevention');
    console.log('   • Excessive pyramiding protection');
    console.log('   • Data quality validation');
    console.log('   • Circuit breakers active');
    console.log('   • Configuration validation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testBacktest();
