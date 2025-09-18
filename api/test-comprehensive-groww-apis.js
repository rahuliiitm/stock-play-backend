const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

async function testComprehensiveGrowwAPIs() {
  const apiKey = process.env.GROWW_API_KEY;
  const apiSecret = process.env.GROWW_API_SECRET;
  
  console.log('🔑 Getting fresh access token...');
  
  // Generate checksum
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const input = apiSecret + timestamp;
  const checksum = crypto.createHash('sha256').update(input).digest('hex');
  
  // Get fresh access token
  const authResponse = await axios.post(
    'https://api.groww.in/v1/token/api/access',
    {
      key_type: 'approval',
      checksum: checksum,
      timestamp: timestamp
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const accessToken = authResponse.data.token;
  console.log('✅ Fresh access token obtained!');
  
  // Test all API endpoints based on official documentation
  const endpoints = [
    // Portfolio APIs (already working)
    { 
      name: 'Get Holdings', 
      url: 'https://api.groww.in/v1/holdings/user', 
      method: 'GET',
      category: 'Portfolio'
    },
    { 
      name: 'Get Positions', 
      url: 'https://api.groww.in/v1/positions/user', 
      method: 'GET',
      category: 'Portfolio'
    },
    
    // Live Data APIs (from official documentation)
    { 
      name: 'Get Quote', 
      url: 'https://api.groww.in/v1/live-data/quote', 
      method: 'GET',
      params: { exchange: 'NSE', segment: 'CASH', trading_symbol: 'RELIANCE' },
      category: 'Live Data'
    },
    { 
      name: 'Get LTP', 
      url: 'https://api.groww.in/v1/live-data/ltp', 
      method: 'GET',
      params: { segment: 'CASH', exchange_symbols: 'NSE_RELIANCE,NSE_TCS' },
      category: 'Live Data'
    },
    { 
      name: 'Get OHLC', 
      url: 'https://api.groww.in/v1/live-data/ohlc', 
      method: 'GET',
      params: { segment: 'CASH', exchange_symbols: 'NSE_RELIANCE,NSE_TCS' },
      category: 'Live Data'
    },
    
    // Historical Data APIs (from official documentation)
    { 
      name: 'Get Historical Data', 
      url: 'https://api.groww.in/v1/historical/candle/bulk', 
      method: 'GET',
      params: { 
        exchange: 'NSE', 
        segment: 'CASH', 
        groww_symbol: 'NSE-RELIANCE',
        start_time: '2025-01-01 09:15:00',
        end_time: '2025-01-02 15:30:00',
        interval_in_minutes: '1440'
      },
      category: 'Historical Data'
    },
    
    // Margin APIs (corrected endpoints)
    { 
      name: 'Get User Margins', 
      url: 'https://api.groww.in/v1/margins/detail/user', 
      method: 'GET',
      category: 'Margin'
    },
    { 
      name: 'Calculate Required Margin', 
      url: 'https://api.groww.in/v1/margins/detail/orders', 
      method: 'POST',
      params: { segment: 'CASH' },
      body: [{
        trading_symbol: 'RELIANCE',
        transaction_type: 'BUY',
        quantity: 1,
        price: 1400,
        order_type: 'LIMIT',
        product: 'CNC',
        exchange: 'NSE'
      }],
      category: 'Margin'
    },
    
    // Order APIs (corrected endpoints)
    { 
      name: 'Get Order List', 
      url: 'https://api.groww.in/v1/order/list', 
      method: 'GET',
      params: { segment: 'CASH', page: 0, page_size: 10 },
      category: 'Orders'
    },
    { 
      name: 'Place Order', 
      url: 'https://api.groww.in/v1/order/create', 
      method: 'POST',
      body: {
        trading_symbol: 'RELIANCE',
        quantity: 1,
        price: 1400,
        trigger_price: 0,
        validity: 'DAY',
        exchange: 'NSE',
        segment: 'CASH',
        product: 'CNC',
        order_type: 'LIMIT',
        transaction_type: 'BUY',
        order_reference_id: `TEST${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      },
      category: 'Orders'
    }
  ];
  
  console.log('\n📋 Testing all Groww API endpoints based on official documentation...');
  
  const results = {
    'Portfolio': { success: 0, failed: 0 },
    'Live Data': { success: 0, failed: 0 },
    'Historical Data': { success: 0, failed: 0 },
    'Margin': { success: 0, failed: 0 },
    'Orders': { success: 0, failed: 0 }
  };
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint.name} (${endpoint.category})`);
      console.log(`URL: ${endpoint.url}`);
      if (endpoint.params) {
        console.log(`Params: ${JSON.stringify(endpoint.params)}`);
      }
      
      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      };
      
      if (endpoint.params) {
        config.params = endpoint.params;
      }
      
      if (endpoint.body) {
        config.headers['Content-Type'] = 'application/json';
      }
      
      let response;
      if (endpoint.method === 'POST') {
        response = await axios.post(endpoint.url, endpoint.body, config);
      } else {
        response = await axios.get(endpoint.url, config);
      }
      
      console.log(`✅ SUCCESS: ${endpoint.name} - Status: ${response.status}`);
      results[endpoint.category].success++;
      
      if (response.data && typeof response.data === 'object') {
        const keys = Object.keys(response.data);
        console.log(`Response keys: ${keys.join(', ')}`);
        
        if (response.data.payload) {
          const payloadKeys = Object.keys(response.data.payload);
          console.log(`Payload keys: ${payloadKeys.join(', ')}`);
          
          // Show sample data for successful responses
          if (payloadKeys.length > 0) {
            const sampleData = JSON.stringify(response.data.payload, null, 2);
            console.log(`Sample data: ${sampleData.substring(0, 300)}${sampleData.length > 300 ? '...' : ''}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${endpoint.name} - Status: ${error.response?.status}`);
      results[endpoint.category].failed++;
      
      if (error.response?.data?.error?.message) {
        console.log(`Error: ${error.response.data.error.message}`);
      } else if (error.response?.data) {
        console.log(`Error data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY OF API ENDPOINT TESTS:');
  console.log('=====================================');
  
  for (const [category, stats] of Object.entries(results)) {
    const total = stats.success + stats.failed;
    const successRate = total > 0 ? ((stats.success / total) * 100).toFixed(1) : 0;
    console.log(`${category}: ${stats.success}/${total} (${successRate}%)`);
  }
  
  const totalSuccess = Object.values(results).reduce((sum, stats) => sum + stats.success, 0);
  const totalFailed = Object.values(results).reduce((sum, stats) => sum + stats.failed, 0);
  const totalTests = totalSuccess + totalFailed;
  const overallSuccessRate = totalTests > 0 ? ((totalSuccess / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`\n🎯 OVERALL: ${totalSuccess}/${totalTests} (${overallSuccessRate}%)`);
  
  if (totalSuccess > 0) {
    console.log('\n✅ Working APIs are ready for integration!');
  } else {
    console.log('\n❌ No APIs are working. Please check credentials and permissions.');
  }
}

testComprehensiveGrowwAPIs().catch(console.error);
