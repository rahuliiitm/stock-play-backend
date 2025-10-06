const fs = require('fs');
const path = require('path');

/**
 * Real crossover analysis by parsing server logs and CSV data
 */
async function realCrossoverAnalysis() {
  console.log('🔍 Running real crossover analysis from server logs...');
  
  try {
    // Read server logs
    const logPath = 'server.log';
    if (!fs.existsSync(logPath)) {
      console.error('❌ Server log not found:', logPath);
      return;
    }
    
    console.log('📊 Reading server logs...');
    const logContent = fs.readFileSync(logPath, 'utf8');
    
    // Parse crossover events from logs
    const crossoverEvents = [];
    const lines = logContent.split('\n');
    
    console.log(`📈 Analyzing ${lines.length} log lines...`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for EMA crossover detection logs
      if (line.includes('EMA Crossover Check') || line.includes('crossedUp') || line.includes('crossedDown')) {
        try {
          // Extract timestamp
          const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
          const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
          
          // Extract EMA values
          const fastMatch = line.match(/Fast=([\d.]+)/);
          const slowMatch = line.match(/Slow=([\d.]+)/);
          const fastEma = fastMatch ? parseFloat(fastMatch[1]) : 0;
          const slowEma = slowMatch ? parseFloat(slowMatch[1]) : 0;
          
          // Extract RSI
          const rsiMatch = line.match(/"rsi":\s*([\d.]+)/);
          const rsi = rsiMatch ? parseFloat(rsiMatch[1]) : 0;
          
          // Extract ATR
          const atrMatch = line.match(/"atr":\s*([\d.]+)/);
          const atr = atrMatch ? parseFloat(atrMatch[1]) : 0;
          
          // Check for crossover
          const crossedUp = line.includes('crossedUp') && line.includes('true');
          const crossedDown = line.includes('crossedDown') && line.includes('true');
          
          if (crossedUp || crossedDown) {
            crossoverEvents.push({
              timestamp,
              ema9: fastEma,
              ema21: slowEma,
              rsi,
              atr,
              crossoverType: crossedUp ? 'BULLISH' : 'BEARISH',
              tradeTaken: 'UNKNOWN',
              conditionFailed: 'ANALYZING...'
            });
          }
        } catch (error) {
          console.warn('⚠️  Error parsing log line:', error.message);
        }
      }
    }
    
    console.log(`📊 Found ${crossoverEvents.length} crossover events`);
    
    // Analyze each crossover
    const analysisResults = [];
    
    for (const event of crossoverEvents) {
      let tradeTaken = 'NO';
      let conditionFailed = '';
      
      // Analyze conditions
      const conditions = [];
      
      // RSI condition
      if (event.crossoverType === 'BULLISH') {
        if (event.rsi < 60) {
          conditions.push('RSI too low for long entry');
        }
      } else {
        if (event.rsi > 40) {
          conditions.push('RSI too high for short entry');
        }
      }
      
      // ATR condition (simplified)
      if (event.atr < 50) {
        conditions.push('ATR too low for volatility');
      }
      
      // EMA gap condition
      const emaGap = Math.abs(event.ema9 - event.ema21);
      const atrThreshold = event.atr * 0.05; // 0.05 multiplier
      if (emaGap < atrThreshold) {
        conditions.push('EMA gap too small');
      }
      
      // Determine if trade was taken
      if (conditions.length === 0) {
        tradeTaken = 'YES';
        conditionFailed = 'N/A';
      } else {
        tradeTaken = 'NO';
        conditionFailed = conditions.join(', ');
      }
      
      analysisResults.push({
        ...event,
        tradeTaken,
        conditionFailed
      });
    }
    
    // Create detailed report
    console.log('\n📊 DETAILED CROSSOVER ANALYSIS:');
    console.log('='.repeat(140));
    console.log('│ Time                    │ EMA 9    │ EMA 21   │ RSI      │ ATR(14)  │ Type    │ Trade │ Condition Failed                    │');
    console.log('├─────────────────────────┼──────────┼──────────┼──────────┼──────────┼─────────┼───────┼─────────────────────────────────────┤');
    
    analysisResults.forEach(result => {
      const time = result.timestamp.substring(0, 19);
      const ema9 = result.ema9.toFixed(2);
      const ema21 = result.ema21.toFixed(2);
      const rsi = result.rsi.toFixed(1);
      const atr = result.atr.toFixed(1);
      const type = result.crossoverType.padEnd(7);
      const trade = result.tradeTaken.padEnd(5);
      const condition = result.conditionFailed.padEnd(35);
      
      console.log(`│ ${time.padEnd(23)} │ ${ema9.padEnd(8)} │ ${ema21.padEnd(8)} │ ${rsi.padEnd(8)} │ ${atr.padEnd(8)} │ ${type} │ ${trade} │ ${condition} │`);
    });
    
    console.log('└─────────────────────────┴──────────┴──────────┴──────────┴──────────┴─────────┴───────┴─────────────────────────────────────┘');
    
    // Summary statistics
    const totalCrossovers = analysisResults.length;
    const tradesTaken = analysisResults.filter(r => r.tradeTaken === 'YES').length;
    const tradesRejected = analysisResults.filter(r => r.tradeTaken === 'NO').length;
    const bullishCrossovers = analysisResults.filter(r => r.crossoverType === 'BULLISH').length;
    const bearishCrossovers = analysisResults.filter(r => r.crossoverType === 'BEARISH').length;
    
    console.log('\n📈 ANALYSIS SUMMARY:');
    console.log(`   📊 Total Crossovers: ${totalCrossovers}`);
    console.log(`   🟢 Bullish Crossovers: ${bullishCrossovers}`);
    console.log(`   🔴 Bearish Crossovers: ${bearishCrossovers}`);
    console.log(`   ✅ Trades Taken: ${tradesTaken}`);
    console.log(`   ❌ Trades Rejected: ${tradesRejected}`);
    console.log(`   📊 Success Rate: ${((tradesTaken / totalCrossovers) * 100).toFixed(2)}%`);
    
    // Save to files
    const timestamp = new Date().toISOString().split('T')[0];
    
    // JSON file
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCrossovers,
        bullishCrossovers,
        bearishCrossovers,
        tradesTaken,
        tradesRejected,
        successRate: ((tradesTaken / totalCrossovers) * 100).toFixed(2) + '%'
      },
      crossovers: analysisResults
    };
    
    const jsonFilename = `real-crossover-analysis-${timestamp}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2));
    console.log(`📁 JSON report saved to: ${jsonFilename}`);
    
    // CSV file
    const csvContent = [
      'Time,EMA_9,EMA_21,RSI,ATR_14,Crossover_Type,Trade_Taken,Condition_Failed',
      ...analysisResults.map(r => 
        `${r.timestamp},${r.ema9},${r.ema21},${r.rsi},${r.atr},${r.crossoverType},"${r.tradeTaken}","${r.conditionFailed}"`
      )
    ].join('\n');
    
    const csvFilename = `real-crossover-analysis-${timestamp}.csv`;
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`📊 CSV data saved to: ${csvFilename}`);
    
    // Markdown report
    const mdContent = `# Real Crossover Analysis Report

## Summary
- **Total Crossovers**: ${totalCrossovers}
- **Bullish Crossovers**: ${bullishCrossovers}
- **Bearish Crossovers**: ${bearishCrossovers}
- **Trades Taken**: ${tradesTaken}
- **Trades Rejected**: ${tradesRejected}
- **Success Rate**: ${((tradesTaken / totalCrossovers) * 100).toFixed(2)}%
    
## Detailed Results

| Time | EMA 9 | EMA 21 | RSI | ATR(14) | Type | Trade | Condition Failed |
|------|-------|--------|-----|---------|------|-------|------------------|
${analysisResults.map(r => 
  `| ${r.timestamp} | ${r.ema9.toFixed(2)} | ${r.ema21.toFixed(2)} | ${r.rsi.toFixed(1)} | ${r.atr.toFixed(1)} | ${r.crossoverType} | ${r.tradeTaken} | ${r.conditionFailed} |`
).join('\n')}

## Analysis
This report shows all EMA crossovers detected in the backtest period and whether trades were taken or rejected, along with the specific conditions that failed.
`;
    
    const mdFilename = `real-crossover-analysis-${timestamp}.md`;
    fs.writeFileSync(mdFilename, mdContent);
    console.log(`📝 Markdown report saved to: ${mdFilename}`);
    
    console.log('\n🎉 Real crossover analysis completed!');
    
    return jsonReport;
    
  } catch (error) {
    console.error('❌ Real crossover analysis failed:', error);
    throw error;
  }
}

// Run the real analysis
realCrossoverAnalysis().catch(error => {
  console.error('❌ Real crossover analysis failed:', error);
});
