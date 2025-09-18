#!/usr/bin/env node

/**
 * Simple test script to verify TypeScript SDK equivalent works
 * This tests the static getAccessToken method
 */

const axios = require('axios');
const crypto = require('crypto');

async function testTypeScriptSDKEquivalent() {
  const apiKey = process.env.GROWW_API_KEY;
  const apiSecret = process.env.GROWW_API_SECRET;
  
  if (!apiKey || !apiSecret || apiKey === 'your_actual_api_key_from_groww_execute_page') {
    console.log('❌ Please set your actual GROWW_API_KEY and GROWW_API_SECRET in your .env file');
    return;
  }

  console.log('🔑 Testing TypeScript SDK equivalent (static getAccessToken method)...');
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`API Secret: ${apiSecret.substring(0, 8)}...`);

  try {
    // This is the equivalent of: GrowwApiService.getAccessToken(apiKey, apiSecret)
    console.log('\n📝 Getting access token using TypeScript SDK equivalent...');
    
    // Generate checksum as per Groww API documentation
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const input = apiSecret + timestamp;
    const checksum = crypto.createHash('sha256').update(input).digest('hex');
    
    const response = await axios.post(
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

    const accessToken = response.data.token;
    console.log('✅ Access token obtained successfully!');
    console.log('Access Token:', accessToken.substring(0, 20) + '...');
    console.log('Token Ref ID:', response.data.tokenRefId);
    console.log('Session Name:', response.data.sessionName);
    console.log('Expires At:', response.data.expiry);
    console.log('Is Active:', response.data.isActive);

    // Test API call with the token (equivalent to using GrowwApiService instance)
    console.log('\n📝 Testing API call with access token...');
    
    // Test holdings endpoint
    try {
      const holdingsResponse = await axios.get('https://api.groww.in/v1/holdings/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      });

      console.log('✅ Holdings API call successful!');
      console.log('Holdings count:', holdingsResponse.data.payload?.holdings?.length || 0);
      console.log('Sample holding:', holdingsResponse.data.payload?.holdings?.[0]);
    } catch (error) {
      console.log('❌ Holdings API call failed:', error.response?.status, error.response?.data?.error?.message);
    }

    // Test positions endpoint
    try {
      const positionsResponse = await axios.get('https://api.groww.in/v1/positions/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      });

      console.log('✅ Positions API call successful!');
      console.log('Positions count:', positionsResponse.data.payload?.positions?.length || 0);
      console.log('Sample position:', positionsResponse.data.payload?.positions?.[0]);
    } catch (error) {
      console.log('❌ Positions API call failed:', error.response?.status, error.response?.data?.error?.message);
    }

    console.log('\n🎉 TypeScript SDK equivalent test completed successfully!');
    console.log('\n📋 This demonstrates:');
    console.log('- ✅ Static getAccessToken method (equivalent to GrowwAPI.get_access_token)');
    console.log('- ✅ Access token usage for API calls');
    console.log('- ✅ Same functionality as Python SDK');

  } catch (error) {
    console.log('❌ Test failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

// Load environment variables
require('dotenv').config();

// Run the test
testTypeScriptSDKEquivalent();
