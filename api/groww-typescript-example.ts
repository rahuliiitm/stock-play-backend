/**
 * TypeScript equivalent of Python SDK usage
 * 
 * Python SDK:
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

async function exampleUsage() {
  // Your API credentials
  const apiKey = "YOUR_API_KEY";
  const apiSecret = "YOUR_API_SECRET";

  // Step 1: Get access token (equivalent to GrowwAPI.get_access_token(api_key=api_key, secret=secret))
  const accessToken = await GrowwApiService.getAccessToken(apiKey, apiSecret);

  // Step 2: Initialize GrowwApiService with access token (equivalent to growwapi = GrowwAPI(access_token))
  // Note: In a real NestJS application, you would inject dependencies properly
  const growwApiService = new GrowwApiService(
    configService, // ConfigService instance
    redis,         // Redis instance
    accessToken    // Access token from step 1
  );

  // Now you can use the service for API calls
  // Example: Get portfolio overview
  const portfolioData = await growwApiService.getMargins();
  
  // Example: Get holdings
  const holdings = await growwApiService.getHoldings();
  
  // Example: Get positions
  const positions = await growwApiService.getPositions();
  
  // Example: Place an order
  const orderResponse = await growwApiService.placeOrder({
    symbol: 'RELIANCE',
    side: 'BUY',
    quantity: 1,
    orderType: 'MARKET',
    productType: 'CNC'
  });

  console.log('Portfolio:', portfolioData);
  console.log('Holdings:', holdings);
  console.log('Positions:', positions);
  console.log('Order placed:', orderResponse);
}

// Note: Logins will expire at 6AM every day, please visit the API keys page and click 'approve' before running login everyday.
// This is handled automatically by the GrowwApiService - it will re-authenticate when needed.
