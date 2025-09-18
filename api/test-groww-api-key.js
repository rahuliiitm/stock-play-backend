#!/usr/bin/env node

/**
 * Test script for Groww API Key Authentication
 * 
 * Usage:
 * 1. Set your API key and secret in .env file:
 *    GROWW_API_KEY=your_actual_api_key
 *    GROWW_API_SECRET=your_actual_api_secret
 * 
 * 2. Run this script:
 *    node test-groww-api-key.js
 */

const axios = require('axios');

async function testGrowwApiKeyAuth() {
  const apiKey = process.env.GROWW_API_KEY;
  const apiSecret = process.env.GROWW_API_SECRET;
  
  if (!apiKey || !apiSecret || apiKey === 'your_actual_api_key_from_groww_execute_page') {
    console.log('❌ Please set your actual GROWW_API_KEY and GROWW_API_SECRET in your .env file');
    console.log('');
    console.log('To get your API Key and Secret:');
    console.log('1. Go to: https://groww.in/execute-api-keys');
    console.log('2. Log in to your Groww account');
    console.log('3. Click "Generate API key"');
    console.log('4. Enter a name for the key and click Continue');
    console.log('5. Copy the API Key and Secret');
    console.log('');
    console.log('Then update your .env file:');
    console.log('GROWW_API_KEY=your_actual_api_key_from_step_5');
    console.log('GROWW_API_SECRET=your_actual_api_secret_from_step_5');
    return;
  }

  console.log('🔑 Testing Groww API Key + Secret Authentication...');
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`API Secret: ${apiSecret.substring(0, 8)}...`);

  try {
    // Generate checksum as per Groww API documentation
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const input = apiSecret + timestamp;
    const checksum = crypto.createHash('sha256').update(input).digest('hex');
    
    console.log('Generated checksum:', checksum);
    console.log('Timestamp:', timestamp);

    // Test authentication endpoint using Groww API Key + Secret flow
    const authResponse = await axios.post('https://api.groww.in/v1/token/api/access', {
      key_type: 'approval',
      checksum: checksum,
      timestamp: timestamp
    }, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Authentication successful!');
    console.log('Access Token:', authResponse.data.token?.substring(0, 20) + '...');
    console.log('Token Ref ID:', authResponse.data.tokenRefId);
    console.log('Session Name:', authResponse.data.sessionName);
    console.log('Expires At:', authResponse.data.expiry);
    console.log('Is Active:', authResponse.data.isActive);

    // Test a simple API call with the token
    const testResponse = await axios.get('https://api.groww.in/v1/portfolio/overview', {
      headers: {
        'Authorization': `Bearer ${authResponse.data.token}`,
        'Accept': 'application/json',
        'X-API-VERSION': '1.0'
      }
    });

    console.log('✅ API call successful!');
    console.log('Portfolio data:', testResponse.data);

  } catch (error) {
    console.log('❌ Authentication failed:');
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
testGrowwApiKeyAuth();
