const axios = require('axios');

async function testSafetyCheck() {
  console.log('🧪 Testing safety check...');
  
  const config = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-09-27T00:00:00.000Z'),
    endDate: new Date('2024-09-29T23:59:59.000Z'),
    initialBalance: 100000,
    strategyConfig: {
      id: 'minimal-test',
      name: 'Minimal Test Strategy',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      atrMultiplierEntry: 0.01,
      atrMultiplierUnwind: 0.75,
      strongCandleThreshold: 0.01,
      gapUpDownThreshold: 0.01,
      rsiPeriod: 14,
      rsiEntryLong: 10,
      rsiEntryShort: 90,
      rsiExitLong: 50,
      rsiExitShort: 50,
      capital: 100000,
      maxLossPct: 0.01,
      positionSize: 1,
      maxLots: 5,
      pyramidingEnabled: true,
      exitMode: 'FIFO',
      misExitTime: '15:15',
      cncExitTime: '15:15',
      slopeLookback: 3
    }
  };

  try {
    console.log('📤 Sending safety check request...');
    const response = await axios.post('http://localhost:20001/backtest/validation/safety-check', config);
    
    console.log('✅ Safety check completed!');
    console.log('📊 Safety Result:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error during safety check:', error.response?.data || error.message);
  }
}

testSafetyCheck();
