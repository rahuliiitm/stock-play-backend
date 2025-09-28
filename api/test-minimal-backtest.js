const axios = require('axios');

async function testMinimalBacktest() {
  console.log('🧪 Testing minimal backtest configuration...');
  
  const minimalConfig = {
    symbol: 'NIFTY',
    timeframe: '15m',
    startDate: new Date('2024-09-27T00:00:00.000Z'),
    endDate: new Date('2024-12-31T23:59:59.000Z'),
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
      atrMultiplierUnwind: 0.75,
      strongCandleThreshold: 0.01, // Very low threshold
      gapUpDownThreshold: 0.01, // Very low threshold
      rsiPeriod: 14,
      rsiEntryLong: 10, // Very low threshold
      rsiEntryShort: 90, // Very high threshold
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
    console.log('📤 Sending minimal backtest request...');
    const response = await axios.post('http://localhost:20001/backtest/run-nifty', minimalConfig);
    
    console.log('✅ Backtest completed!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.totalTrades === 0) {
      console.log('❌ Still no trades generated. Let me check the logs...');
    } else {
      console.log('🎉 Trades generated successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error during backtest:', error.response?.data || error.message);
  }
}

testMinimalBacktest();
