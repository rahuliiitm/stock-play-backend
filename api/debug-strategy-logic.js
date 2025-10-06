const { spawn } = require('child_process');

// Debug script to understand what's happening with the strategy
async function debugStrategyLogic() {
  console.log('🔍 Debugging Strategy Logic');
  console.log('=' .repeat(50));
  
  // Create a minimal test configuration
  const debugConfig = {
    // Minimal configuration to understand the issue
    emaFastPeriod: 9,
    emaSlowPeriod: 21,
    rsiEntryLong: 0,      // Disable RSI
    rsiEntryShort: 0,     // Disable RSI
    rsiExitLong: 0,       // Disable RSI
    rsiExitShort: 0,      // Disable RSI
    maxLots: 1,           // Single position only
    trailingStopEnabled: false,
    // Add debug logging
    debugMode: true
  };
  
  return new Promise((resolve, reject) => {
    console.log('🔧 Running minimal EMA-only strategy...');
    
    // Modify the backtest script for debugging
    const fs = require('fs');
    const originalScript = fs.readFileSync('run-optimized-backtest-direct.js', 'utf8');
    
    let modifiedScript = originalScript;
    
    // Apply debug configuration
    modifiedScript = modifiedScript.replace(/emaFastPeriod: \d+/, `emaFastPeriod: ${debugConfig.emaFastPeriod}`);
    modifiedScript = modifiedScript.replace(/emaSlowPeriod: \d+/, `emaSlowPeriod: ${debugConfig.emaSlowPeriod}`);
    modifiedScript = modifiedScript.replace(/rsiEntryLong: \d+/, `rsiEntryLong: ${debugConfig.rsiEntryLong}`);
    modifiedScript = modifiedScript.replace(/rsiEntryShort: \d+/, `rsiEntryShort: ${debugConfig.rsiEntryShort}`);
    modifiedScript = modifiedScript.replace(/rsiExitLong: \d+/, `rsiExitLong: ${debugConfig.rsiExitLong}`);
    modifiedScript = modifiedScript.replace(/rsiExitShort: \d+/, `rsiExitShort: ${debugConfig.rsiExitShort}`);
    modifiedScript = modifiedScript.replace(/maxLots: \d+/, `maxLots: ${debugConfig.maxLots}`);
    modifiedScript = modifiedScript.replace(/trailingStopEnabled: (true|false)/, `trailingStopEnabled: ${debugConfig.trailingStopEnabled}`);
    
    // Write temporary script
    const tempFile = `temp-debug-${Date.now()}.js`;
    fs.writeFileSync(tempFile, modifiedScript);
    
    // Run with limited output to focus on key metrics
    const child = spawn('node', [tempFile], {
      cwd: '/Users/rjain/stockplay/stock-play-backend/api',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Show only key debug information
      if (text.includes('EMA crossover') || text.includes('Trade executed') || text.includes('Trade closed')) {
        console.log(text.trim());
      }
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      // Clean up
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      
      if (code !== 0) {
        console.error('❌ Debug failed:', errorOutput);
        resolve({ error: errorOutput });
        return;
      }
      
      // Parse and show results
      console.log('\n📊 DEBUG RESULTS:');
      const totalTradesMatch = output.match(/Total Trades: (\d+)/);
      const totalReturnMatch = output.match(/Total Return: ₹([\d,]+\.?\d*) \(([\d.]+)%\)/);
      const winRateMatch = output.match(/Win Rate: ([\d.]+)%/);
      const avgWinMatch = output.match(/Average Win: ₹([\d.]+)/);
      const avgLossMatch = output.match(/Average Loss: ₹([\d.]+)/);
      
      if (totalTradesMatch) console.log(`📈 Total Trades: ${totalTradesMatch[1]}`);
      if (totalReturnMatch) console.log(`💰 Total Return: ${totalReturnMatch[2]}%`);
      if (winRateMatch) console.log(`🎯 Win Rate: ${winRateMatch[1]}%`);
      if (avgWinMatch) console.log(`📊 Average Win: ₹${avgWinMatch[1]}`);
      if (avgLossMatch) console.log(`📊 Average Loss: ₹${avgLossMatch[1]}`);
      
      // Show sample trades
      const tradeMatches = output.match(/Trade.*?P&L:.*?%/g);
      if (tradeMatches && tradeMatches.length > 0) {
        console.log('\n🔍 Sample Trades:');
        tradeMatches.slice(0, 10).forEach(trade => {
          console.log(`   ${trade}`);
        });
      }
      
      resolve({ success: true, output });
    });
    
    // Timeout
    setTimeout(() => {
      child.kill();
      resolve({ error: 'Timeout' });
    }, 120000);
  });
}

debugStrategyLogic().catch(console.error);


