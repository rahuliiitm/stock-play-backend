#!/usr/bin/env node

/**
 * Test script for Groww Access Token Authentication
 * 
 * Usage:
 * 1. Set your access token in .env file:
 *    GROWW_ACCESS_TOKEN=your_actual_access_token
 * 
 * 2. Run this script:
 *    node test-groww-access-token.js
 */

const axios = require('axios');

async function testGrowwAccessToken() {
  const accessToken = process.env.GROWW_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ Please set GROWW_ACCESS_TOKEN in your .env file');
    console.log('');
    console.log('To get your Access Token:');
    console.log('1. Log in to your Groww account');
    console.log('2. Click on the profile section at the Right-top of your screen');
    console.log('3. Click on the setting icon in the menu');
    console.log('4. In the navigation list, select "Trading APIs"');
    console.log('5. Click on "Generate API keys" and select "Access Token"');
    console.log('6. Copy the generated access token');
    console.log('');
    console.log('Then update your .env file:');
    console.log('GROWW_ACCESS_TOKEN=your_actual_access_token_from_step_6');
    return;
  }

  console.log('🔑 Testing Groww Access Token Authentication...');
  console.log(`Access Token: ${accessToken.substring(0, 20)}...`);

  try {
    // Test a simple API call with the access token
    const testResponse = await axios.get('https://api.groww.in/v1/portfolio/overview', {
      headers: {
        'Authorization': accessToken,
        'Accept': 'application/json',
        'X-API-VERSION': '1.0'
      }
    });

    console.log('✅ API call successful!');
    console.log('Portfolio data:', testResponse.data);

    // Test another endpoint - get holdings
    const holdingsResponse = await axios.get('https://api.groww.in/v1/portfolio/holdings', {
      headers: {
        'Authorization': accessToken,
        'Accept': 'application/json',
        'X-API-VERSION': '1.0'
      }
    });

    console.log('✅ Holdings API call successful!');
    console.log('Holdings data:', holdingsResponse.data);

  } catch (error) {
    console.log('❌ API call failed:');
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
testGrowwAccessToken();
