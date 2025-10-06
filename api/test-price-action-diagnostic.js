const { PriceActionStrategyService } = require('./dist/src/modules/strategy/services/price-action-strategy.service');
const fs = require('fs');
const path = require('path');

async function testPriceActionDiagnostic() {
  console.log('🔍 Price Action Strategy - Signal Frequency Diagnostic');
  console.log('='.repeat(60));

  try {
    const strategy = new PriceActionStrategyService();

    // Read NIFTY weekly data
    const dataDir = process.env.CSV_DATA_DIR || '/Users/rjain/stockplay/stock-play-backend/api/data';
    const csvPath = path.join(dataDir, 'NIFTY_10year_1w.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Data file not found: ${csvPath}`);
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 6) {
        candles.push({
          symbol: 'NIFTY',
          timestamp: new Date(values[0]).getTime(),
          open: parseFloat(values[1]),
          high: parseFloat(values[2]),
          low: parseFloat(values[3]),
          close: parseFloat(values[4]),
          volume: parseFloat(values[5]) || 0,
          timeframe: '1w'
        });
      }
    }

    console.log(`📈 Loaded ${candles.length} weekly candles`);
    console.log(`📅 Date range: ${new Date(candles[0].timestamp).toISOString().split('T')[0]} to ${new Date(candles[candles.length - 1].timestamp).toISOString().split('T')[0]}`);

    // Test different parameter configurations
    const configs = [
      {
        name: 'Current Config (Conservative)',
        supertrendPeriod: 10,
        supertrendMultiplier: 2.0,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
      },
      {
        name: 'More Sensitive ST',
        supertrendPeriod: 7,
        supertrendMultiplier: 1.5,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
      },
      {
        name: 'Faster MACD',
        supertrendPeriod: 10,
        supertrendMultiplier: 2.0,
        macdFast: 8,
        macdSlow: 21,
        macdSignal: 5,
      },
      {
        name: 'Both Sensitive',
        supertrendPeriod: 7,
        supertrendMultiplier: 1.5,
        macdFast: 8,
        macdSlow: 21,
        macdSignal: 5,
      }
    ];

    for (const config of configs) {
      console.log(`\n🔧 Testing: ${config.name}`);
      console.log(`   ST: ${config.supertrendPeriod}, ${config.supertrendMultiplier} | MACD: ${config.macdFast}, ${config.macdSlow}, ${config.macdSignal}`);
      
      let totalSignals = 0;
      let entrySignals = 0;
      let exitSignals = 0;
      let currentPosition = null;
      let alignmentOpportunities = 0;
      let supertrendOnlyOpportunities = 0;
      let macdOnlyOpportunities = 0;

      // Test on last 100 candles for speed
      const testCandles = candles.slice(-100);
      
      for (let i = 0; i < testCandles.length; i++) {
        const currentCandles = testCandles.slice(0, i + 1);
        
        if (currentCandles.length < Math.max(config.supertrendPeriod, config.macdSlow) + 10) {
          continue;
        }
        
        try {
          const context = {
            activeTrades: currentPosition ? [currentPosition] : []
          };
          
          const result = await strategy.evaluate({
            id: 'test',
            name: 'test',
            symbol: 'NIFTY',
            timeframe: '1w',
            ...config
          }, currentCandles, context);
          
          if (result && result.signals && result.signals.length > 0) {
            totalSignals += result.signals.length;
            result.signals.forEach(signal => {
              if (signal.type === 'ENTRY' && currentPosition === null) {
                entrySignals++;
                currentPosition = {
                  direction: signal.data.direction,
                  entryPrice: parseFloat(signal.data.price),
                  entryTime: signal.timestamp,
                  metadata: signal.data.metadata
                };
              } else if (signal.type === 'EXIT' && currentPosition !== null) {
                exitSignals++;
                currentPosition = null;
              }
            });
          }

          // Check alignment opportunities (for diagnostic)
          if (result && result.diagnostics) {
            const diag = result.diagnostics;
            if (diag.supertrend && diag.macd) {
              const latestCandle = currentCandles[currentCandles.length - 1];
              const close = latestCandle.close;
              const supertrend = diag.supertrend;
              const macd = diag.macd;
              const macdSignal = diag.macdSignal;
              
              const supertrendBullish = close > supertrend;
              const supertrendBearish = close < supertrend;
              const macdBullish = macd > macdSignal;
              const macdBearish = macd < macdSignal;
              
              if (supertrendBullish && macdBullish) {
                alignmentOpportunities++;
              } else if (supertrendBearish && macdBearish) {
                alignmentOpportunities++;
              }
              
              if (supertrendBullish || supertrendBearish) {
                supertrendOnlyOpportunities++;
              }
              
              if (macdBullish || macdBearish) {
                macdOnlyOpportunities++;
              }
            }
          }
        } catch (error) {
          // Skip errors
        }
      }
      
      console.log(`   📊 Results:`);
      console.log(`      Total Signals: ${totalSignals}`);
      console.log(`      Entries: ${entrySignals}, Exits: ${exitSignals}`);
      console.log(`      Alignment Opportunities: ${alignmentOpportunities}`);
      console.log(`      ST Only Opportunities: ${supertrendOnlyOpportunities}`);
      console.log(`      MACD Only Opportunities: ${macdOnlyOpportunities}`);
      console.log(`      Signal Rate: ${(totalSignals / testCandles.length * 100).toFixed(2)}% of candles`);
    }

    // Test on different timeframes for comparison
    console.log(`\n📊 Comparing with Daily Data...`);
    const dailyCsvPath = path.join(dataDir, 'NIFTY_10year_1d.csv');
    if (fs.existsSync(dailyCsvPath)) {
      const dailyContent = fs.readFileSync(dailyCsvPath, 'utf8');
      const dailyLines = dailyContent.trim().split('\n');
      
      const dailyCandles = [];
      for (let i = 1; i < dailyLines.length; i++) {
        const values = dailyLines[i].split(',');
        if (values.length >= 6) {
          dailyCandles.push({
            symbol: 'NIFTY',
            timestamp: new Date(values[0]).getTime(),
            open: parseFloat(values[1]),
            high: parseFloat(values[2]),
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
            volume: parseFloat(values[5]) || 0,
            timeframe: '1d'
          });
        }
      }
      
      console.log(`📈 Daily candles: ${dailyCandles.length}`);
      console.log(`📈 Weekly candles: ${candles.length}`);
      console.log(`📊 Daily/Weekly ratio: ${(dailyCandles.length / candles.length).toFixed(1)}x`);
      
      // Test daily with same parameters
      const testDailyCandles = dailyCandles.slice(-500); // Last 500 daily candles
      let dailySignals = 0;
      let dailyPosition = null;
      
      for (let i = 0; i < testDailyCandles.length; i++) {
        const currentCandles = testDailyCandles.slice(0, i + 1);
        
        if (currentCandles.length < Math.max(10, 26) + 10) {
          continue;
        }
        
        try {
          const context = {
            activeTrades: dailyPosition ? [dailyPosition] : []
          };
          
          const result = await strategy.evaluate({
            id: 'test',
            name: 'test',
            symbol: 'NIFTY',
            timeframe: '1d',
            supertrendPeriod: 10,
            supertrendMultiplier: 2.0,
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
          }, currentCandles, context);
          
          if (result && result.signals && result.signals.length > 0) {
            dailySignals += result.signals.length;
            result.signals.forEach(signal => {
              if (signal.type === 'ENTRY' && dailyPosition === null) {
                dailyPosition = { direction: signal.data.direction };
              } else if (signal.type === 'EXIT' && dailyPosition !== null) {
                dailyPosition = null;
              }
            });
          }
        } catch (error) {
          // Skip errors
        }
      }
      
      console.log(`📊 Daily signals: ${dailySignals} in ${testDailyCandles.length} candles`);
      console.log(`📊 Daily signal rate: ${(dailySignals / testDailyCandles.length * 100).toFixed(2)}% of candles`);
    }

  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
  }
}

testPriceActionDiagnostic().catch(console.error);
