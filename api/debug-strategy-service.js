const fs = require('fs');
const path = require('path');
const { EMA, ATR, RSI, ADX } = require('technicalindicators');

/**
 * Debug the exact strategy service logic to find the EMA issue
 */
function debugStrategyService() {
  console.log('🔍 Debugging strategy service logic...');
  
  // Read CSV data
  const csvPath = path.join(__dirname, 'data', 'NIFTY_15m.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Parse candles (mimicking CsvDataProvider)
  const candles = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 6) {
      candles.push({
        timestamp: parseInt(values[0]),
        open: parseFloat(values[1]),
        high: parseFloat(values[2]),
        low: parseFloat(values[3]),
        close: parseFloat(values[4]),
        volume: parseFloat(values[5])
      });
    }
  }
  
  console.log('📊 Loaded candles:', candles.length);
  console.log('📊 First candle:', candles[0]);
  console.log('📊 Last candle:', candles[candles.length - 1]);
  
  // Mimic strategy service logic
  const config = {
    emaFastPeriod: 9,
    emaSlowPeriod: 21,
    atrPeriod: 14,
    rsiPeriod: 14
  };
  
  console.log('\n🔧 Strategy config:', config);
  
  // Extract arrays (mimicking strategy service)
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const opens = candles.map((c) => c.open);
  
  console.log('\n📊 Data arrays:');
  console.log('  Closes length:', closes.length);
  console.log('  First 5 closes:', closes.slice(0, 5));
  console.log('  Last 5 closes:', closes.slice(-5));
  
  // Check data sufficiency
  const minRequired = Math.max(config.emaSlowPeriod, config.atrPeriod, config.rsiPeriod) + 5;
  console.log('\n📊 Data sufficiency check:');
  console.log('  Available candles:', closes.length);
  console.log('  Required minimum:', minRequired);
  console.log('  Sufficient data:', closes.length >= minRequired);
  
  if (closes.length < minRequired) {
    console.log('❌ Insufficient data for calculation');
    return;
  }
  
  // Calculate indicators (mimicking strategy service)
  console.log('\n🧮 Calculating indicators...');
  
  try {
    const fastSeries = EMA.calculate({
      period: config.emaFastPeriod,
      values: closes,
    });
    
    const slowSeries = EMA.calculate({
      period: config.emaSlowPeriod,
      values: closes,
    });
    
    const atrSeries = ATR.calculate({
      period: config.atrPeriod,
      high: highs,
      low: lows,
      close: closes,
    });
    
    const rsiSeries = RSI.calculate({
      period: config.rsiPeriod,
      values: closes,
    });
    
    console.log('\n📈 Indicator results:');
    console.log('  Fast EMA length:', fastSeries.length);
    console.log('  Slow EMA length:', slowSeries.length);
    console.log('  ATR length:', atrSeries.length);
    console.log('  RSI length:', rsiSeries.length);
    
    if (fastSeries.length > 0) {
      console.log('  Fast EMA latest:', fastSeries[fastSeries.length - 1]);
      console.log('  Fast EMA first 5:', fastSeries.slice(0, 5));
      console.log('  Fast EMA last 5:', fastSeries.slice(-5));
    }
    
    if (slowSeries.length > 0) {
      console.log('  Slow EMA latest:', slowSeries[slowSeries.length - 1]);
      console.log('  Slow EMA first 5:', slowSeries.slice(0, 5));
      console.log('  Slow EMA last 5:', slowSeries.slice(-5));
    }
    
    if (atrSeries.length > 0) {
      console.log('  ATR latest:', atrSeries[atrSeries.length - 1]);
    }
    
    if (rsiSeries.length > 0) {
      console.log('  RSI latest:', rsiSeries[rsiSeries.length - 1]);
    }
    
    // Check for zero values
    const fastLatest = fastSeries[fastSeries.length - 1];
    const slowLatest = slowSeries[slowSeries.length - 1];
    
    console.log('\n🔍 Value analysis:');
    console.log('  Fast EMA latest:', fastLatest, 'Type:', typeof fastLatest, 'isNaN:', isNaN(fastLatest));
    console.log('  Slow EMA latest:', slowLatest, 'Type:', typeof slowLatest, 'isNaN:', isNaN(slowLatest));
    
    if (fastLatest === 0 || slowLatest === 0) {
      console.log('❌ FOUND THE ISSUE: EMA values are 0!');
      console.log('  This explains why the strategy shows 0.00 for EMAs');
    } else {
      console.log('✅ EMA values are correct');
    }
    
  } catch (error) {
    console.error('❌ Indicator calculation error:', error);
  }
}

// Run the debug
debugStrategyService();
