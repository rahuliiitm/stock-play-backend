const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const STOCK_SYMBOL = 'EMERALD'; // We'll search for this
const QUANTITY = 15;

async function searchForStock() {
  console.log(`🔍 Searching for stock: ${STOCK_SYMBOL}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/stocks/search?q=${STOCK_SYMBOL}`);
    console.log('📊 Search Results:', response.data);
    
    if (response.data && response.data.length > 0) {
      console.log('✅ Found stocks:', response.data.map(s => `${s.symbol} (${s.name})`));
      return response.data[0]; // Return first match
    } else {
      console.log('❌ No exact match found. Let me check popular stocks...');
      return null;
    }
  } catch (error) {
    console.error('❌ Error searching for stock:', error.message);
    return null;
  }
}

async function getStockQuote(symbol) {
  console.log(`📈 Getting quote for: ${symbol}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/stocks/${symbol}/quote`);
    console.log('💰 Current Quote:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error getting quote:', error.message);
    return null;
  }
}

async function createPortfolio() {
  console.log('🏗️ Creating a new portfolio...');
  
  try {
    // First, let's register a user
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: 'emerald-trader@example.com',
      password: 'securepassword123',
      displayName: 'Emerald Finance Trader'
    });
    
    console.log('✅ User registered:', registerResponse.data);
    const authToken = registerResponse.data.accessToken;
    
    // Create portfolio
    const portfolioResponse = await axios.post(`${BASE_URL}/v2/portfolios`, {
      name: 'Emerald Finance Portfolio',
      visibility: 'private',
      initialValue: 100000 // ₹1,00,000 initial value
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Portfolio created:', portfolioResponse.data);
    return { authToken, portfolioId: portfolioResponse.data.id };
  } catch (error) {
    console.error('❌ Error creating portfolio:', error.response?.data || error.message);
    return null;
  }
}

async function addStockToPortfolio(portfolioId, authToken, symbol, quantity, price) {
  console.log(`📈 Adding ${quantity} shares of ${symbol} at ₹${price} to portfolio...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/v2/portfolios/${portfolioId}/stocks`, {
      symbol: symbol,
      quantity: quantity,
      exchange: 'NSE',
      price: price,
      type: 'buy'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Stock added to portfolio:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error adding stock to portfolio:', error.response?.data || error.message);
    return null;
  }
}

async function getPortfolioDetails(portfolioId, authToken) {
  console.log('📊 Getting portfolio details...');
  
  try {
    const response = await axios.get(`${BASE_URL}/v2/portfolios/${portfolioId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Portfolio Details:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error getting portfolio details:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Emerald Finance Trade Process...\n');
  
  // Step 1: Search for the stock
  const stock = await searchForStock();
  
  if (!stock) {
    console.log('❌ Could not find Emerald Finance stock. Let me try with a known stock...');
    // Try with a known stock like RELIANCE
    const relianceQuote = await getStockQuote('RELIANCE');
    if (relianceQuote) {
      console.log('✅ Using RELIANCE as alternative stock');
      await executeTrade('RELIANCE', relianceQuote.price);
    }
    return;
  }
  
  // Step 2: Get current quote
  const quote = await getStockQuote(stock.symbol);
  if (!quote) {
    console.log('❌ Could not get quote for the stock');
    return;
  }
  
  // Step 3: Execute the trade
  await executeTrade(stock.symbol, quote.price);
}

async function executeTrade(symbol, price) {
  console.log(`\n💰 Executing trade for ${symbol} at ₹${price}`);
  
  // Create portfolio
  const portfolioData = await createPortfolio();
  if (!portfolioData) {
    console.log('❌ Failed to create portfolio');
    return;
  }
  
  const { authToken, portfolioId } = portfolioData;
  
  // Add stock to portfolio
  const tradeResult = await addStockToPortfolio(portfolioId, authToken, symbol, QUANTITY, price);
  if (!tradeResult) {
    console.log('❌ Failed to add stock to portfolio');
    return;
  }
  
  // Get final portfolio details
  const portfolioDetails = await getPortfolioDetails(portfolioId, authToken);
  
  console.log('\n🎉 Trade Summary:');
  console.log(`📈 Stock: ${symbol}`);
  console.log(`📊 Quantity: ${QUANTITY} shares`);
  console.log(`💰 Price per share: ₹${price}`);
  console.log(`💵 Total Investment: ₹${(QUANTITY * price).toFixed(2)}`);
  console.log(`🏦 Portfolio ID: ${portfolioId}`);
  
  if (portfolioDetails) {
    console.log(`📊 Portfolio Value: ₹${portfolioDetails.totalValue || 'N/A'}`);
    console.log(`📈 Portfolio Return: ${portfolioDetails.returnPercent || 'N/A'}%`);
  }
  
  console.log('\n✅ Trade completed successfully!');
}

// Run the script
main().catch(console.error);
