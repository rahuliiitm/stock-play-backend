const fs = require('fs');
const path = require('path');

/**
 * Targeted crossover analysis by reading recent server logs
 */
async function targetedCrossoverAnalysis() {
  console.log('🔍 Running targeted crossover analysis...');
  
  try {
    // Read only the last 1000 lines of server log to avoid memory issues
    console.log('📊 Reading recent server logs...');
    
    const logPath = 'server.log';
    if (!fs.existsSync(logPath)) {
      console.error('❌ Server log not found:', logPath);
      return;
    }
    
    // Read file in chunks to get recent logs
    const stats = fs.statSync(logPath);
    const fileSize = stats.size;
    const chunkSize = 1024 * 1024; // 1MB chunks
    const startPosition = Math.max(0, fileSize - (10 * chunkSize)); // Last 10MB
    
    console.log(`📈 File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📊 Reading from position: ${(startPosition / 1024 / 1024).toFixed(2)}MB`);
    
    const fd = fs.openSync(logPath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    let logContent = '';
    
    for (let pos = startPosition; pos < fileSize; pos += chunkSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, Math.min(chunkSize, fileSize - pos), pos);
      logContent += buffer.toString('utf8', 0, bytesRead);
    }
    
    fs.closeSync(fd);
    
    console.log(`📊 Read ${(logContent.length / 1024 / 1024).toFixed(2)}MB of log data`);
    
    // Parse crossover events from logs
    const crossoverEvents = [];
    const lines = logContent.split('\n');
    
    console.log(`📈 Analyzing ${lines.length} log lines...`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for specific crossover patterns
      if (line.includes('EMA Crossover Check') || 
          line.includes('crossedUp') || 
          line.includes('crossedDown') ||
          line.includes('GAP LONG ENTRY') ||
          line.includes('GAP SHORT ENTRY') ||
          line.includes('STANDARD LONG ENTRY') ||
          line.includes('STANDARD SHORT ENTRY')) {
        
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
          
          // Check for entry signals
          const gapLongEntry = line.includes('GAP LONG ENTRY');
          const gapShortEntry = line.includes('GAP SHORT ENTRY');
          const standardLongEntry = line.includes('STANDARD LONG ENTRY');
          const standardShortEntry = line.includes('STANDARD SHORT ENTRY');
          
          if (crossedUp || crossedDown || gapLongEntry || gapShortEntry || standardLongEntry || standardShortEntry) {
            let crossoverType = 'UNKNOWN';
            let tradeTaken = 'NO';
            let conditionFailed = 'ANALYZING...';
            
            if (crossedUp || gapLongEntry || standardLongEntry) {
              crossoverType = 'BULLISH';
              if (gapLongEntry || standardLongEntry) {
                tradeTaken = 'YES';
                conditionFailed = 'N/A';
              }
            } else if (crossedDown || gapShortEntry || standardShortEntry) {
              crossoverType = 'BEARISH';
              if (gapShortEntry || standardShortEntry) {
                tradeTaken = 'YES';
                conditionFailed = 'N/A';
              }
            }
            
            crossoverEvents.push({
              timestamp,
              ema9: fastEma,
              ema21: slowEma,
              rsi,
              atr,
              crossoverType,
              tradeTaken,
              conditionFailed,
              rawLine: line.substring(0, 100) + '...'
            });
          }
        } catch (error) {
          console.warn('⚠️  Error parsing log line:', error.message);
        }
      }
    }
    
    console.log(`📊 Found ${crossoverEvents.length} crossover events`);
    
    // Sort by timestamp
    crossoverEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Create detailed report
    console.log('\n📊 DETAILED CROSSOVER ANALYSIS:');
    console.log('='.repeat(150));
    console.log('│ Time                    │ EMA 9    │ EMA 21   │ RSI      │ ATR(14)  │ Type    │ Trade │ Condition Failed                    │');
    console.log('├─────────────────────────┼──────────┼──────────┼──────────┼──────────┼─────────┼───────┼─────────────────────────────────────┤');
    
    crossoverEvents.forEach(result => {
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
    const totalCrossovers = crossoverEvents.length;
    const tradesTaken = crossoverEvents.filter(r => r.tradeTaken === 'YES').length;
    const tradesRejected = crossoverEvents.filter(r => r.tradeTaken === 'NO').length;
    const bullishCrossovers = crossoverEvents.filter(r => r.crossoverType === 'BULLISH').length;
    const bearishCrossovers = crossoverEvents.filter(r => r.crossoverType === 'BEARISH').length;
    
    console.log('\n📈 ANALYSIS SUMMARY:');
    console.log(`   📊 Total Crossovers: ${totalCrossovers}`);
    console.log(`   🟢 Bullish Crossovers: ${bullishCrossovers}`);
    console.log(`   🔴 Bearish Crossovers: ${bearishCrossovers}`);
    console.log(`   ✅ Trades Taken: ${tradesTaken}`);
    console.log(`   ❌ Trades Rejected: ${tradesRejected}`);
    console.log(`   📊 Success Rate: ${totalCrossovers > 0 ? ((tradesTaken / totalCrossovers) * 100).toFixed(2) : 0}%`);
    
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
        successRate: totalCrossovers > 0 ? ((tradesTaken / totalCrossovers) * 100).toFixed(2) + '%' : '0%'
      },
      crossovers: crossoverEvents
    };
    
    const jsonFilename = `targeted-crossover-analysis-${timestamp}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2));
    console.log(`📁 JSON report saved to: ${jsonFilename}`);
    
    // CSV file
    const csvContent = [
      'Time,EMA_9,EMA_21,RSI,ATR_14,Crossover_Type,Trade_Taken,Condition_Failed',
      ...crossoverEvents.map(r => 
        `${r.timestamp},${r.ema9},${r.ema21},${r.rsi},${r.atr},${r.crossoverType},"${r.tradeTaken}","${r.conditionFailed}"`
      )
    ].join('\n');
    
    const csvFilename = `targeted-crossover-analysis-${timestamp}.csv`;
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`📊 CSV data saved to: ${csvFilename}`);
    
    // Markdown report
    const mdContent = `# Targeted Crossover Analysis Report

## Summary
- **Total Crossovers**: ${totalCrossovers}
- **Bullish Crossovers**: ${bullishCrossovers}
- **Bearish Crossovers**: ${bearishCrossovers}
- **Trades Taken**: ${tradesTaken}
- **Trades Rejected**: ${tradesRejected}
- **Success Rate**: ${totalCrossovers > 0 ? ((tradesTaken / totalCrossovers) * 100).toFixed(2) : 0}%

## Detailed Results

| Time | EMA 9 | EMA 21 | RSI | ATR(14) | Type | Trade | Condition Failed |
|------|-------|--------|-----|---------|------|-------|------------------|
${crossoverEvents.map(r => 
  `| ${r.timestamp} | ${r.ema9.toFixed(2)} | ${r.ema21.toFixed(2)} | ${r.rsi.toFixed(1)} | ${r.atr.toFixed(1)} | ${r.crossoverType} | ${r.tradeTaken} | ${r.conditionFailed} |`
).join('\n')}

## Analysis
This report shows all EMA crossovers detected in the recent backtest period and whether trades were taken or rejected, along with the specific conditions that failed.

## Raw Log Data
${crossoverEvents.map(r => `\n**${r.timestamp}**: ${r.rawLine}`).join('')}
`;
    
    const mdFilename = `targeted-crossover-analysis-${timestamp}.md`;
    fs.writeFileSync(mdFilename, mdContent);
    console.log(`📝 Markdown report saved to: ${mdFilename}`);
    
    console.log('\n🎉 Targeted crossover analysis completed!');
    
    return jsonReport;
    
  } catch (error) {
    console.error('❌ Targeted crossover analysis failed:', error);
    throw error;
  }
}

// Run the targeted analysis
targetedCrossoverAnalysis().catch(error => {
  console.error('❌ Targeted crossover analysis failed:', error);
});
