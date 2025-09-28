const axios = require('axios');

async function debugCompleteFlow() {
  console.log('🔍 Debugging Complete Backtest Flow...');
  
  try {
    // Test 1: Check if the API is responding
    console.log('\n📡 Test 1: API Health Check');
    try {
      const healthResponse = await axios.get('http://localhost:20003/backtest/example-config');
      console.log('✅ API is responding');
      console.log(`📋 Example config received: ${JSON.stringify(healthResponse.data, null, 2)}`);
    } catch (error) {
      console.error('❌ API health check failed:', error.message);
      return;
    }

    // Test 2: Test with minimal configuration
    console.log('\n🧪 Test 2: Minimal Configuration Test');
    const minimalConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-09-27T00:00:00.000Z',
      endDate: '2024-09-29T23:59:59.000Z', // Just 3 days from the data range
      initialBalance: 100000,
      strategyConfig: {
        id: 'minimal-test',
        name: 'Minimal Test Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.01, // Very low threshold
        atrMultiplierUnwind: 0.3,
        strongCandleThreshold: 0.1,
        gapUpDownThreshold: 0.3,
        rsiPeriod: 14,
        rsiEntryLong: 30, // Very permissive
        rsiEntryShort: 70, // Very permissive
        rsiExitLong: 30,
        rsiExitShort: 70,
        slopeLookback: 3,
        capital: 100000,
        maxLossPct: 0.05,
        positionSize: 1,
        maxLots: 5,
        pyramidingEnabled: true,
        exitMode: 'FIFO',
        misExitTime: '15:15',
        cncExitTime: '15:15',
      }
    };

    console.log('📤 Sending minimal config backtest request...');
    const minimalResponse = await axios.post('http://localhost:20003/backtest/run-nifty', minimalConfig);
    
    console.log('✅ Minimal backtest completed!');
    console.log(`📊 Total Trades: ${minimalResponse.data.totalTrades}`);
    console.log(`💰 Total Return: ${minimalResponse.data.totalReturnPercentage?.toFixed(2)}%`);
    console.log(`📈 Win Rate: ${(minimalResponse.data.winRate * 100)?.toFixed(2)}%`);
    console.log(`📉 Max Drawdown: ${(minimalResponse.data.maxDrawdown * 100)?.toFixed(2)}%`);
    
    if (minimalResponse.data.totalTrades > 0) {
      console.log('\n🎯 SUCCESS: Minimal config generated trades!');
      console.log('This suggests the issue is with the threshold or other parameters.');
    } else {
      console.log('\n❌ Even minimal config shows 0 trades.');
      console.log('This suggests a deeper issue in the backtest flow.');
    }

    // Test 3: Test with even more permissive settings
    console.log('\n🧪 Test 3: Ultra-Permissive Configuration Test');
    const ultraPermissiveConfig = {
      ...minimalConfig,
      strategyConfig: {
        ...minimalConfig.strategyConfig,
        atrMultiplierEntry: 0.001, // Extremely low
        rsiEntryLong: 10, // Extremely permissive
        rsiEntryShort: 90, // Extremely permissive
        strongCandleThreshold: 0.01, // Very low
        gapUpDownThreshold: 0.01, // Very low
      }
    };

    console.log('📤 Sending ultra-permissive config backtest request...');
    const ultraResponse = await axios.post('http://localhost:20003/backtest/run-nifty', ultraPermissiveConfig);
    
    console.log('✅ Ultra-permissive backtest completed!');
    console.log(`📊 Total Trades: ${ultraResponse.data.totalTrades}`);
    console.log(`💰 Total Return: ${ultraResponse.data.totalReturnPercentage?.toFixed(2)}%`);
    
    if (ultraResponse.data.totalTrades > 0) {
      console.log('\n🎯 SUCCESS: Ultra-permissive config generated trades!');
    } else {
      console.log('\n❌ Even ultra-permissive config shows 0 trades.');
      console.log('This confirms there is a fundamental issue in the backtest flow.');
    }

    // Test 4: Check the actual response structure
    console.log('\n🔍 Test 4: Response Structure Analysis');
    console.log('Full response structure:');
    console.log(JSON.stringify(ultraResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error during complete flow debug:', error.response?.data || error.message);
  }
}

debugCompleteFlow();
