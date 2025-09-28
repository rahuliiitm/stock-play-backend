const { EmaGapAtrStrategyService } = require('./dist/src/modules/strategy/services/ema-gap-atr-strategy.service');
const { CsvDataProvider } = require('./dist/src/modules/trading/providers/csv-data-provider');
const { Logger } = require('@nestjs/common');

// Mock Logger for direct testing
class MockLogger extends Logger {
  log(message) { console.log(`[MockLogger] ${message}`); }
  warn(message) { console.warn(`[MockLogger] ${message}`); }
  error(message, trace) { console.error(`[MockLogger] ${message}`, trace); }
  debug(message) { console.log(`[MockLogger DEBUG] ${message}`); }
}

async function testStrategyDirectly() {
  console.log('🧪 Testing strategy evaluation directly...');

  // Set up CSV data directory
  process.env.CSV_DATA_DIR = './data';

  const csvProvider = new CsvDataProvider();
  csvProvider['logger'] = new MockLogger();

  const strategyService = new EmaGapAtrStrategyService();
  strategyService['logger'] = new MockLogger();

  const symbol = 'NIFTY';
  const timeframe = '15m';
  const startDate = new Date('2024-09-27T00:00:00.000Z');
  const endDate = new Date('2024-10-10T23:59:59.000Z');

  console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    // Load data
    const candles = await csvProvider.getHistoricalCandles(
      symbol,
      timeframe,
      startDate,
      endDate
    );

    console.log(`📊 Loaded ${candles.length} candles`);

    if (candles.length === 0) {
      console.log('❌ No candles loaded.');
      return;
    }

    // Test strategy evaluation
    const strategyConfig = {
      id: 'test-strategy',
      name: 'Test Strategy',
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
    };

    console.log('🔍 Testing strategy evaluation...');
    const result = strategyService.evaluate(strategyConfig, candles);

    console.log('✅ Strategy evaluation completed!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (result.signals && result.signals.length > 0) {
      console.log(`🎉 Generated ${result.signals.length} signals!`);
      result.signals.forEach((signal, index) => {
        console.log(`Signal ${index + 1}:`, {
          type: signal.type,
          direction: signal.data?.direction,
          strength: signal.strength,
          confidence: signal.confidence,
          timestamp: signal.timestamp
        });
      });
    } else {
      console.log('❌ No signals generated');
    }

  } catch (error) {
    console.error('❌ Error during direct strategy test:', error);
  }
}

testStrategyDirectly();
