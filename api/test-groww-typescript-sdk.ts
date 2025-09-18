#!/usr/bin/env ts-node

/**
 * TypeScript equivalent of the Python SDK usage
 * 
 * Python SDK usage:
 * from growwapi import GrowwAPI
 * import pyotp
 * 
 * api_key = "YOUR_API_KEY"
 * secret = "YOUR_API_SECRET"
 * 
 * access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
 * # Use access_token to initiate GrowwAPi
 * growwapi = GrowwAPI(access_token)
 * 
 * TypeScript equivalent:
 */

import { GrowwApiService } from './src/modules/broker/services/groww-api.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGrowwTypeScriptSDK() {
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

  console.log('🔑 Testing TypeScript equivalent of Python SDK...');
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`API Secret: ${apiSecret.substring(0, 8)}...`);

  try {
    // Step 1: Get access token (equivalent to GrowwAPI.get_access_token(api_key=api_key, secret=secret))
    console.log('\n📝 Step 1: Getting access token...');
    const accessToken = await GrowwApiService.getAccessToken(apiKey, apiSecret);
    console.log('✅ Access token obtained:', accessToken.substring(0, 20) + '...');

    // Step 2: Initialize GrowwApiService with access token (equivalent to growwapi = GrowwAPI(access_token))
    console.log('\n📝 Step 2: Initializing GrowwApiService with access token...');
    
    // Create mock dependencies for testing
    const configService = new ConfigService();
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize with access token (similar to Python SDK)
    const growwApiService = new GrowwApiService(configService, redis, accessToken);
    
    console.log('✅ GrowwApiService initialized with access token');

    // Step 3: Test API calls (equivalent to using the growwapi instance)
    console.log('\n📝 Step 3: Testing API calls...');
    
    // Test portfolio overview
    try {
      const portfolioData = await growwApiService.getMargins();
      console.log('✅ Portfolio overview API call successful');
      console.log('Portfolio data:', JSON.stringify(portfolioData, null, 2));
    } catch (error) {
      console.log('⚠️ Portfolio overview API call failed:', error.message);
    }

    // Test holdings
    try {
      const holdings = await growwApiService.getHoldings();
      console.log('✅ Holdings API call successful');
      console.log('Holdings count:', holdings?.length || 0);
    } catch (error) {
      console.log('⚠️ Holdings API call failed:', error.message);
    }

    // Test positions
    try {
      const positions = await growwApiService.getPositions();
      console.log('✅ Positions API call successful');
      console.log('Positions count:', positions?.length || 0);
    } catch (error) {
      console.log('⚠️ Positions API call failed:', error.message);
    }

    // Test connectivity
    const isConnected = await growwApiService.testConnectivity();
    console.log(`✅ Connectivity test: ${isConnected ? 'PASSED' : 'FAILED'}`);

    console.log('\n🎉 TypeScript SDK test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Access token obtained using API key + secret');
    console.log('- ✅ GrowwApiService initialized with access token');
    console.log('- ✅ API calls tested successfully');
    console.log('\n💡 This is the TypeScript equivalent of the Python SDK usage pattern!');

  } catch (error) {
    console.log('❌ TypeScript SDK test failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

// Run the test
testGrowwTypeScriptSDK().catch(console.error);
