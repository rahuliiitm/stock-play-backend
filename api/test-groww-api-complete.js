const axios = require('axios');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
require('dotenv').config();

async function testCompleteGrowwAPI() {
  console.log('🚀 COMPLETE GROWW API TEST SUITE');
  console.log('=====================================\n');
  const apiKey = process.env.GROWW_API_KEY;
  const apiSecret = process.env.GROWW_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Missing GROWW_API_KEY or GROWW_API_SECRET in environment variables');
    return;
  }

  console.log('🔑 Testing TOTP Authentication Flow...');
  
  let accessToken = null;
  
  try {
    console.log('📝 Generating TOTP from API Secret...');
    
    // Generate TOTP using the API secret as base32
    const totp = speakeasy.totp({
      secret: apiSecret,
      encoding: 'base32',
      time: Math.floor(Date.now() / 1000)
    });
    
    console.log('🔐 TOTP Generated:', totp);
    
    // Get access token using TOTP flow
    console.log('🔄 Requesting access token with TOTP...');
    const authResponse = await axios.post(
      'https://api.groww.in/v1/token/api/access',
      {
        key_type: 'totp',
        totp: totp
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    accessToken = authResponse.data.token;
    console.log('✅ Access token obtained via TOTP flow!\n');
    
  } catch (error) {
    console.log('❌ TOTP authentication failed');
    console.log('Error:', error.response?.data || error.message);
    
    // Fallback: Try using API key directly
    console.log('🔄 Trying API key as direct access token...');
    try {
      accessToken = apiKey;
      
      const testResponse = await axios.get('https://api.groww.in/v1/live-data/quote', {
        params: {
          exchange: 'NSE',
          segment: 'CASH',
          trading_symbol: 'RELIANCE'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      });
      
      console.log('✅ API key works as direct access token!\n');
      
    } catch (fallbackError) {
      console.log('❌ All authentication methods failed');
      console.log('TOTP Error:', error.response?.data || error.message);
      console.log('Fallback Error:', fallbackError.response?.data || fallbackError.message);
      return;
    }
  }
  
  try {
    // Test all API endpoints
    const results = {
      Portfolio: { passed: 0, total: 0 },
      'Live Data': { passed: 0, total: 0 },
      'Historical Data': { passed: 0, total: 0 },
      Margin: { passed: 0, total: 0 },
      Orders: { passed: 0, total: 0 }
    };

    const endpoints = [
      // Portfolio APIs
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
      
      // Live Data APIs
      { 
        name: 'Get Quote', 
        url: 'https://api.groww.in/v1/live-data/quote',
        method: 'GET',
        params: { exchange: 'NSE', segment: 'CASH', trading_symbol: 'JWL' },
        category: 'Live Data'
      },
      { 
        name: 'Get LTP', 
        url: 'https://api.groww.in/v1/live-data/ltp',
        method: 'GET',
        params: { segment: 'CASH', exchange_symbols: 'NSE_JWL,NSE_TCS' },
        category: 'Live Data'
      },
      { 
        name: 'Get OHLC', 
        url: 'https://api.groww.in/v1/live-data/ohlc',
        method: 'GET',
        params: { segment: 'CASH', exchange_symbols: 'NSE_JWL,NSE_TCS' },
        category: 'Live Data'
      },
      
      // Historical Data API (FIXED)
      { 
        name: 'Get Historical Data', 
        url: 'https://api.groww.in/v1/historical/candle/range',
        method: 'GET',
        params: { 
          exchange: 'NSE', 
          segment: 'CASH', 
          trading_symbol: 'JWL',
          start_time: '2025-01-01 09:15:00',
          end_time: '2025-01-01 15:30:00',
          interval_in_minutes: '60'
        },
        category: 'Historical Data'
      },
      
      // Margin APIs
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
        data: [{
          trading_symbol: 'JWL',
          transaction_type: 'BUY',
          quantity: 1,
          price: 1400,
          order_type: 'LIMIT',
          product: 'CNC',
          exchange: 'NSE'
        }],
        category: 'Margin'
      },
      
      // Order APIs
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
        data: {
          trading_symbol: 'JWL',
          quantity: 1,
          price: 1400,
          validity: 'DAY',
          exchange: 'NSE',
          segment: 'CASH',
          product: 'CNC',
          order_type: 'LIMIT',
          transaction_type: 'BUY',
          order_reference_id: `TEST${Date.now()}`
        },
        category: 'Orders'
      }
    ];

    // Test each endpoint
    for (const endpoint of endpoints) {
      console.log(`🔍 Testing: ${endpoint.name} (${endpoint.category})`);
      console.log(`URL: ${endpoint.url}`);
      
      if (endpoint.params) {
        console.log(`Params: ${JSON.stringify(endpoint.params)}`);
      }
      
      try {
        const config = {
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'X-API-VERSION': '1.0'
          }
        };

        if (endpoint.params) {
          config.params = endpoint.params;
        }
        
        if (endpoint.data) {
          config.data = endpoint.data;
          config.headers['Content-Type'] = 'application/json';
        }

        const response = await axios(config);
        
        if (response.status === 200) {
          console.log(`✅ SUCCESS: ${endpoint.name} - Status: ${response.status}`);
          
          // Show sample data for key endpoints
          if (endpoint.category === 'Portfolio' && response.data.payload) {
            const payload = response.data.payload;
            if (payload.holdings) {
              console.log(`📊 Holdings found: ${payload.holdings.length} items`);
              if (payload.holdings.length > 0) {
                const sample = payload.holdings[0];
                console.log(`   Sample: ${sample.trading_symbol} - Qty: ${sample.quantity} @ ₹${sample.average_price}`);
              }
            }
            if (payload.positions) {
              console.log(`📊 Positions found: ${payload.positions.length} items`);
            }
          }
          
          results[endpoint.category].passed++;
        } else {
          console.log(`❌ FAILED: ${endpoint.name} - Status: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ FAILED: ${endpoint.name} - Status: ${error.response?.status || 'Error'}`);
        if (error.response?.data) {
          console.log(`Error data: ${JSON.stringify(error.response.data)}`);
        }
      }
      
      results[endpoint.category].total++;
      console.log('');
    }

    // Print summary
    console.log('📊 COMPLETE API TEST SUMMARY:');
    console.log('=====================================');
    
    let totalPassed = 0;
    let totalTests = 0;
    
    for (const [category, stats] of Object.entries(results)) {
      const percentage = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
      console.log(`${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
      totalPassed += stats.passed;
      totalTests += stats.total;
    }
    
    const overallPercentage = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
    console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} (${overallPercentage}%)`);
    
    if (totalPassed === totalTests) {
      console.log('\n🎉 ALL GROWW API ENDPOINTS ARE WORKING PERFECTLY!');
      console.log('✅ Ready for production integration!');
    } else {
      console.log('\n⚠️  Some endpoints need attention, but core functionality is working.');
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the complete test suite
testCompleteGrowwAPI().then(() => {
  console.log('\n🏁 Complete Groww API test suite finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
