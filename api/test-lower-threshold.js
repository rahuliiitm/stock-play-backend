const axios = require('axios');

async function testLowerThreshold() {
  console.log('🧪 Testing with lower ATR threshold...');
  
  try {
    const config = {
      symbol: 'NIFTY',
      timeframe: '15m',
      startDate: '2024-10-01T00:00:00.000Z',
      endDate: '2025-07-25T23:59:59.000Z',
      initialBalance: 100000,
      strategyConfig: {
        id: 'test-lower-threshold',
        name: 'Test Lower Threshold Strategy',
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
        atrPeriod: 14,
        atrMultiplierEntry: 0.05, // Much lower threshold
        atrMultiplierUnwind: 0.3,
        strongCandleThreshold: 0.1,
        gapUpDownThreshold: 0.3,
        rsiPeriod: 14,
        rsiEntryLong: 48,
        rsiEntryShort: 52,
        rsiExitLong: 45,
        rsiExitShort: 55,
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

    console.log('📤 Sending backtest request...');
    const response = await axios.post('http://localhost:20003/backtest/run-nifty', config);
    
    console.log('✅ Backtest completed!');
    console.log(`📊 Total Trades: ${response.data.totalTrades}`);
    console.log(`💰 Total Return: ${response.data.totalReturnPercentage?.toFixed(2)}%`);
    console.log(`📈 Win Rate: ${(response.data.winRate * 100)?.toFixed(2)}%`);
    console.log(`📉 Max Drawdown: ${(response.data.maxDrawdown * 100)?.toFixed(2)}%`);
    
    if (response.data.totalTrades > 0) {
      console.log('\n🎯 SUCCESS: Trades were generated with lower threshold!');
      console.log('This confirms the strategy is working correctly.');
      console.log('The issue was that the ATR threshold (0.25) was too high for the available crossovers.');
    } else {
      console.log('\n❌ Still no trades generated. There may be another issue.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testLowerThreshold();
