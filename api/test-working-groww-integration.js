const axios = require('axios');
require('dotenv').config();

async function testWorkingGrowwIntegration() {
  console.log('🧪 Testing Working Groww API Integration...');
  
  try {
    // Test 1: Direct API call (working method)
    console.log('\n1️⃣ Testing direct Groww API call...');
    
    const apiKey = process.env.GROWW_API_KEY;
    const apiSecret = process.env.GROWW_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Missing GROWW_API_KEY or GROWW_API_SECRET');
    }
    
    // Get access token
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const input = apiSecret + timestamp;
    const checksum = crypto.createHash('sha256').update(input).digest('hex');
    
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
    console.log('✅ Access token obtained');
    
    // Test holdings API
    const holdingsResponse = await axios.get('https://api.groww.in/v1/holdings/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-API-VERSION': '1.0'
      }
    });
    
    if (holdingsResponse.data.status === 'SUCCESS') {
      const holdings = holdingsResponse.data.payload.holdings;
      console.log(`✅ Holdings API working: ${holdings.length} holdings found`);
      
      if (holdings.length > 0) {
        console.log('Sample holdings:');
        holdings.slice(0, 3).forEach(h => {
          console.log(`  - ${h.trading_symbol}: ${h.quantity} @ ₹${h.average_price}`);
        });
      }
    }
    
    // Test 2: Backend endpoint
    console.log('\n2️⃣ Testing backend endpoint...');
    
    try {
      const backendResponse = await axios.get('http://localhost:3001/portfolio-scheduler/holdings/test-account?userId=test-user');
      console.log('✅ Backend endpoint working');
      console.log('Response:', JSON.stringify(backendResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Backend endpoint failed:', error.response?.status, error.response?.data);
    }
    
    // Test 3: Portfolio summary
    console.log('\n3️⃣ Testing portfolio summary...');
    
    try {
      const summaryResponse = await axios.get('http://localhost:3001/portfolio-scheduler/summary/test-account?userId=test-user');
      console.log('✅ Portfolio summary working');
      console.log('Summary:', JSON.stringify(summaryResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Portfolio summary failed:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkingGrowwIntegration().then(() => {
  console.log('\n🏁 Integration test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});




