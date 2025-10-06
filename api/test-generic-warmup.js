const { WarmupCalculatorService } = require('./dist/src/modules/strategy/services/warmup-calculator.service');

async function testGenericWarmup() {
  console.log('🔧 Testing Generic Warm-up Period Calculator');
  console.log('='.repeat(60));

  try {
    const calculator = new WarmupCalculatorService();

    // Test different strategy configurations
    const testConfigs = [
      {
        name: 'Price Action Strategy',
        config: {
          id: 'price-action',
          name: 'Price Action Strategy',
          symbol: 'NIFTY',
          timeframe: '1w',
          supertrendPeriod: 10,
          supertrendMultiplier: 2.0,
          atrPeriod: 14,
          macdFast: 12,
          macdSlow: 26,
          macdSignal: 9,
        }
      },
      {
        name: 'EMA Gap ATR Strategy',
        config: {
          id: 'ema-gap-atr',
          name: 'EMA Gap ATR Strategy',
          symbol: 'NIFTY',
          timeframe: '1d',
          emaFastPeriod: 9,
          emaSlowPeriod: 21,
          atrPeriod: 14,
          rsiPeriod: 14,
          rsiEntryLong: 50,
          rsiEntryShort: 50,
        }
      },
      {
        name: 'Complex Multi-Indicator Strategy',
        config: {
          id: 'complex-strategy',
          name: 'Complex Strategy',
          symbol: 'NIFTY',
          timeframe: '1h',
          // EMA indicators
          emaFastPeriod: 12,
          emaSlowPeriod: 26,
          emaVerySlowPeriod: 50,
          // MACD indicators
          macdFast: 12,
          macdSlow: 26,
          macdSignal: 9,
          // RSI indicators
          rsiPeriod: 14,
          rsiEntryLong: 30,
          rsiEntryShort: 70,
          // ATR indicators
          atrPeriod: 14,
          atrMultiplier: 2.0,
          // Supertrend indicators
          supertrendPeriod: 10,
          supertrendMultiplier: 3.0,
          // Bollinger Bands
          bbPeriod: 20,
          bbStdDev: 2,
          // Stochastic indicators
          stochKPeriod: 14,
          stochDPeriod: 3,
          // Williams %R
          williamsPeriod: 14,
          // CCI indicators
          cciPeriod: 20,
          // ADX indicators
          adxPeriod: 14,
          // Parabolic SAR
          sarPeriod: 10,
          sarAcceleration: 0.02,
          sarMaximum: 0.2,
          // Ichimoku Cloud
          ichimokuTenkanPeriod: 9,
          ichimokuKijunPeriod: 26,
          ichimokuSenkouBPeriod: 52,
          ichimokuChikouPeriod: 26,
        }
      },
      {
        name: 'Nested Configuration Strategy',
        config: {
          id: 'nested-strategy',
          name: 'Nested Strategy',
          symbol: 'NIFTY',
          timeframe: '1d',
          indicators: {
            trend: {
              emaFastPeriod: 12,
              emaSlowPeriod: 26,
              supertrendPeriod: 10,
              supertrendMultiplier: 2.0,
            },
            momentum: {
              rsiPeriod: 14,
              macdFast: 12,
              macdSlow: 26,
              macdSignal: 9,
            },
            volatility: {
              atrPeriod: 14,
              bbPeriod: 20,
              bbStdDev: 2,
            }
          },
          filters: {
            volume: {
              smaPeriod: 20,
            },
            time: {
              lookbackPeriod: 50,
            }
          }
        }
      },
      {
        name: 'Array Configuration Strategy',
        config: {
          id: 'array-strategy',
          name: 'Array Strategy',
          symbol: 'NIFTY',
          timeframe: '1d',
          emaPeriods: [5, 10, 20, 50, 100, 200],
          rsiPeriods: [14, 21],
          atrPeriods: [10, 14, 20],
          macdConfigs: [
            { fast: 12, slow: 26, signal: 9 },
            { fast: 8, slow: 21, signal: 5 },
            { fast: 5, slow: 13, signal: 3 }
          ]
        }
      }
    ];

    for (const testCase of testConfigs) {
      console.log(`\n📊 Testing: ${testCase.name}`);
      console.log(`   Symbol: ${testCase.config.symbol}, Timeframe: ${testCase.config.timeframe}`);
      
      // Calculate warm-up period
      const warmupPeriod = calculator.calculateWarmupPeriod(testCase.config);
      console.log(`   ✅ Generic Warm-up Period: ${warmupPeriod} candles`);
      
      // Get detailed analysis
      const analysis = calculator.getWarmupAnalysis(testCase.config);
      console.log(`   📈 Detected Indicators: ${analysis.detectedIndicators.length}`);
      
      if (analysis.detectedIndicators.length > 0) {
        console.log(`   🔍 Indicator Details:`);
        analysis.detectedIndicators.forEach(indicator => {
          console.log(`      - ${indicator.name}: ${indicator.period} (${indicator.type})`);
        });
      }
      
      if (analysis.recommendations.length > 0) {
        console.log(`   💡 Recommendations:`);
        analysis.recommendations.forEach(rec => {
          console.log(`      - ${rec}`);
        });
      }
      
      // Calculate time equivalent
      const timeframe = testCase.config.timeframe;
      let timeDescription = '';
      if (timeframe === '1w') {
        timeDescription = `${warmupPeriod} weeks (${(warmupPeriod / 52).toFixed(1)} years)`;
      } else if (timeframe === '1d') {
        timeDescription = `${warmupPeriod} days (${(warmupPeriod / 252).toFixed(1)} years)`;
      } else if (timeframe === '1h') {
        timeDescription = `${warmupPeriod} hours (${(warmupPeriod / 24).toFixed(1)} days)`;
      } else if (timeframe === '15m') {
        timeDescription = `${warmupPeriod} minutes (${(warmupPeriod / 60).toFixed(1)} hours)`;
      } else {
        timeDescription = `${warmupPeriod} candles`;
      }
      
      console.log(`   📅 Time equivalent: ${timeDescription}`);
    }

    // Test edge cases
    console.log(`\n🔍 Testing Edge Cases:`);
    
    const edgeCases = [
      {
        name: 'No Indicators',
        config: { id: 'test', name: 'test', symbol: 'NIFTY' }
      },
      {
        name: 'Single Indicator',
        config: { id: 'test', name: 'test', symbol: 'NIFTY', rsiPeriod: 14 }
      },
      {
        name: 'Very Long Periods',
        config: { 
          id: 'test', 
          name: 'test', 
          symbol: 'NIFTY',
          emaSlowPeriod: 200,
          macdSlow: 100,
          supertrendPeriod: 50
        }
      }
    ];

    for (const edgeCase of edgeCases) {
      console.log(`\n   📊 ${edgeCase.name}:`);
      const warmupPeriod = calculator.calculateWarmupPeriod(edgeCase.config);
      console.log(`      Warm-up Period: ${warmupPeriod} candles`);
    }

  } catch (error) {
    console.error('❌ Error testing generic warm-up calculator:', error);
  }
}

testGenericWarmup().catch(console.error);
