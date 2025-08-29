const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

async function searchStocks(query) {
  console.log(`🔍 Searching for: "${query}"`);
  
  try {
    const response = await axios.get(`${BASE_URL}/stocks/search?q=${encodeURIComponent(query)}`);
    console.log('📊 Search Results:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Search error:', error.message);
    return [];
  }
}

async function getStockQuote(symbol) {
  console.log(`📈 Getting quote for: ${symbol}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/stocks/${encodeURIComponent(symbol)}/quote`);
    console.log('💰 Quote:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Quote error for ${symbol}:`, error.response?.data || error.message);
    return null;
  }
}

async function getStockHistory(symbol) {
  console.log(`📊 Getting history for: ${symbol}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/stocks/${encodeURIComponent(symbol)}/history`);
    console.log('📈 History:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ History error for ${symbol}:`, error.response?.data || error.message);
    return null;
  }
}

async function testBSEvsNSE() {
  console.log('🚀 Testing BSE vs NSE Symbol Handling\n');
  
  // Test 1: Search for BSE symbol 538882
  console.log('=== Test 1: BSE Symbol 538882 ===');
  const bseResults = await searchStocks('538882');
  
  if (bseResults.length > 0) {
    const bseSymbol = bseResults[0];
    console.log(`\n📋 Found BSE Symbol: ${bseSymbol.symbol} (${bseSymbol.name})`);
    
    // Try to get quote
    const bseQuote = await getStockQuote(bseSymbol.symbol);
    if (bseQuote) {
      console.log('✅ BSE symbol quote successful!');
    } else {
      console.log('❌ BSE symbol quote failed - might not be available in Groww API');
    }
  }
  
  // Test 2: Search for popular NSE symbols
  console.log('\n=== Test 2: Popular NSE Symbols ===');
  const popularSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'];
  
  for (const symbol of popularSymbols) {
    console.log(`\n🔍 Testing: ${symbol}`);
    const results = await searchStocks(symbol);
    
    if (results.length > 0) {
      const stock = results[0];
      console.log(`📋 Found: ${stock.symbol} (${stock.name}) on ${stock.exchange}`);
      
      const quote = await getStockQuote(stock.symbol);
      if (quote) {
        console.log(`✅ Quote: ₹${quote.price} (${quote.source})`);
      } else {
        console.log('❌ Quote failed');
      }
    }
  }
  
  // Test 3: Search for "Emerald" related stocks
  console.log('\n=== Test 3: Emerald Related Stocks ===');
  const emeraldResults = await searchStocks('EMERALD');
  
  for (const stock of emeraldResults) {
    console.log(`\n📋 Found: ${stock.symbol} (${stock.name}) on ${stock.exchange}`);
    
    const quote = await getStockQuote(stock.symbol);
    if (quote) {
      console.log(`✅ Quote: ₹${quote.price} (${quote.source})`);
    } else {
      console.log('❌ Quote failed - not available in Groww API');
    }
  }
}

async function findWorkingStocks() {
  console.log('\n🔍 Finding Stocks That Work with Groww API\n');
  
  const testSymbols = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
    'AXISBANK', 'ASIANPAINT', 'MARUTI', 'HCLTECH', 'SUNPHARMA'
  ];
  
  const workingStocks = [];
  
  for (const symbol of testSymbols) {
    console.log(`Testing ${symbol}...`);
    const quote = await getStockQuote(symbol);
    
    if (quote && quote.price > 0) {
      workingStocks.push({
        symbol: symbol,
        price: quote.price,
        source: quote.source,
        asOf: quote.asOf
      });
      console.log(`✅ ${symbol}: ₹${quote.price}`);
    } else {
      console.log(`❌ ${symbol}: Not available`);
    }
  }
  
  console.log('\n📊 Working Stocks Summary:');
  console.log(JSON.stringify(workingStocks, null, 2));
  
  return workingStocks;
}

async function main() {
  console.log('🚀 Enhanced Stock Search and Analysis\n');
  
  // Test BSE vs NSE handling
  await testBSEvsNSE();
  
  // Find working stocks
  const workingStocks = await findWorkingStocks();
  
  console.log('\n🎯 Recommendations:');
  console.log('1. Use NSE symbols (like RELIANCE, TCS) for reliable quotes');
  console.log('2. BSE symbols (like 538882) exist in database but may not work with Groww API');
  console.log('3. Some stocks (like EMERALD) are in database but not actively traded');
  
  if (workingStocks.length > 0) {
    console.log('\n💡 Best stocks for trading:');
    workingStocks.slice(0, 5).forEach(stock => {
      console.log(`   - ${stock.symbol}: ₹${stock.price}`);
    });
  }
}

// Run the script
main().catch(console.error);
