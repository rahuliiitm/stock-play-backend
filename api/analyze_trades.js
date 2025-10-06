const fs = require('fs');

// Run the backtest and capture the trade data
const { spawn } = require('child_process');

console.log('🔍 ANALYZING TRADE PATTERNS...\n');

const child = spawn('node', ['test-trend-following-strategy.js'], {
  cwd: '/Users/rjain/stockplay/stock-play-backend/api',
  env: { ...process.env, CSV_DATA_DIR: '/Users/rjain/stockplay/stock-play-backend/api/data' }
});

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
});

child.stderr.on('data', (data) => {
  output += data.toString();
});

child.on('close', (code) => {
  // Extract trade data from output
  const tradeLines = output.match(/\d+\.\s+(LONG|SHORT)\s+NIFTY[\s\S]*?P&L:\s*₹([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)/g) || [];
  
  console.log(`📊 FOUND ${tradeLines.length} TRADES\n`);
  
  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;
  let maxWin = 0;
  let maxLoss = 0;
  let smallLosses = 0; // < 1%
  let mediumLosses = 0; // 1-3%
  let largeLosses = 0; // > 3%
  let smallWins = 0; // < 2%
  let mediumWins = 0; // 2-5%
  let largeWins = 0; // > 5%
  
  const losingTradesList = [];
  const winningTradesList = [];
  
  tradeLines.forEach((line, index) => {
    const match = line.match(/(\d+)\.\s+(LONG|SHORT)\s+NIFTY[\s\S]*?Entry:\s*([\d-]+T[\d:\.]+Z)\s*@\s*₹([\d,\.]+)[\s\S]*?Exit:\s*([\d-]+T[\d:\.]+Z)\s*@\s*₹([\d,\.]+)[\s\S]*?Qty:\s*(\d+)[\s\S]*?P&L:\s*₹([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)/);
    
    if (match) {
      const [, tradeNum, direction, entryTime, entryPrice, exitTime, exitPrice, qty, pnl, pnlPercent] = match;
      const pnlValue = parseFloat(pnl);
      const pnlPercentValue = parseFloat(pnlPercent);
      
      totalTrades++;
      
      if (pnlValue > 0) {
        winningTrades++;
        totalWinAmount += pnlValue;
        maxWin = Math.max(maxWin, pnlValue);
        
        if (pnlPercentValue < 2) smallWins++;
        else if (pnlPercentValue <= 5) mediumWins++;
        else largeWins++;
        
        winningTradesList.push({
          tradeNum: parseInt(tradeNum),
          direction,
          entryTime,
          entryPrice: parseFloat(entryPrice),
          exitTime,
          exitPrice: parseFloat(exitPrice),
          qty: parseInt(qty),
          pnl: pnlValue,
          pnlPercent: pnlPercentValue
        });
      } else {
        losingTrades++;
        totalLossAmount += Math.abs(pnlValue);
        maxLoss = Math.min(maxLoss, pnlValue);
        
        if (Math.abs(pnlPercentValue) < 1) smallLosses++;
        else if (Math.abs(pnlPercentValue) <= 3) mediumLosses++;
        else largeLosses++;
        
        losingTradesList.push({
          tradeNum: parseInt(tradeNum),
          direction,
          entryTime,
          entryPrice: parseFloat(entryPrice),
          exitTime,
          exitPrice: parseFloat(exitPrice),
          qty: parseInt(qty),
          pnl: pnlValue,
          pnlPercent: pnlPercentValue
        });
      }
    }
  });
  
  console.log('📈 WINNING TRADES ANALYSIS:');
  console.log(`   Total Wins: ${winningTrades} (${((winningTrades/totalTrades)*100).toFixed(1)}%)`);
  console.log(`   Total Win Amount: ₹${totalWinAmount.toFixed(2)}`);
  console.log(`   Average Win: ₹${(totalWinAmount/winningTrades).toFixed(2)}`);
  console.log(`   Max Win: ₹${maxWin.toFixed(2)}`);
  console.log(`   Small Wins (<2%): ${smallWins}`);
  console.log(`   Medium Wins (2-5%): ${mediumWins}`);
  console.log(`   Large Wins (>5%): ${largeWins}\n`);
  
  console.log('📉 LOSING TRADES ANALYSIS:');
  console.log(`   Total Losses: ${losingTrades} (${((losingTrades/totalTrades)*100).toFixed(1)}%)`);
  console.log(`   Total Loss Amount: ₹${totalLossAmount.toFixed(2)}`);
  console.log(`   Average Loss: ₹${(totalLossAmount/losingTrades).toFixed(2)}`);
  console.log(`   Max Loss: ₹${Math.abs(maxLoss).toFixed(2)}`);
  console.log(`   Small Losses (<1%): ${smallLosses}`);
  console.log(`   Medium Losses (1-3%): ${mediumLosses}`);
  console.log(`   Large Losses (>3%): ${largeLosses}\n`);
  
  console.log('🔍 LARGEST LOSING TRADES:');
  losingTradesList
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, 10)
    .forEach(trade => {
      console.log(`   Trade ${trade.tradeNum}: ${trade.direction} ${trade.entryPrice} → ${trade.exitPrice} = ₹${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    });
  
  console.log('\n🔍 LARGEST WINNING TRADES:');
  winningTradesList
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10)
    .forEach(trade => {
      console.log(`   Trade ${trade.tradeNum}: ${trade.direction} ${trade.entryPrice} → ${trade.exitPrice} = ₹${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    });
  
  console.log('\n💡 KEY INSIGHTS:');
  console.log(`   Win Rate: ${((winningTrades/totalTrades)*100).toFixed(1)}%`);
  console.log(`   Average Win: ₹${(totalWinAmount/winningTrades).toFixed(2)}`);
  console.log(`   Average Loss: ₹${(totalLossAmount/losingTrades).toFixed(2)}`);
  console.log(`   Risk/Reward Ratio: ${(totalWinAmount/winningTrades)/(totalLossAmount/losingTrades).toFixed(2)}`);
  console.log(`   Profit Factor: ${(totalWinAmount/totalLossAmount).toFixed(2)}`);
  
  if (largeLosses > largeWins) {
    console.log('\n❌ PROBLEM: More large losses than large wins');
  }
  if (smallWins > smallLosses) {
    console.log('\n✅ GOOD: More small wins than small losses');
  }
  if (totalLossAmount > totalWinAmount) {
    console.log('\n❌ PROBLEM: Total losses exceed total wins');
  }
});
