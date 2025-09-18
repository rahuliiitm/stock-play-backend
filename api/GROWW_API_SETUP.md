# Groww API Setup Guide

## TypeScript SDK Equivalent

This project provides a TypeScript equivalent of the Python Groww SDK. Here's how to use it:

### Python SDK Usage:
```python
from growwapi import GrowwAPI
import pyotp

api_key = "YOUR_API_KEY"
secret = "YOUR_API_SECRET"

access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
# Use access_token to initiate GrowwAPi
growwapi = GrowwAPI(access_token)
```

### TypeScript Equivalent:
```typescript
import { GrowwApiService } from './src/modules/broker/services/groww-api.service';

// Step 1: Get access token (equivalent to GrowwAPI.get_access_token)
const accessToken = await GrowwApiService.getAccessToken(apiKey, apiSecret);

// Step 2: Initialize service with access token (equivalent to GrowwAPI(access_token))
const growwApiService = new GrowwApiService(configService, redis, accessToken);
```

## Environment Configuration

Create a `.env` file in the `/api` directory with the following variables:

```env
# Method 1: API Key + Secret (Recommended - similar to Python SDK)
GROWW_API_KEY=your_actual_api_key_from_groww_execute_page
GROWW_API_SECRET=your_actual_api_secret_from_groww_execute_page

# Method 2: Direct Access Token (Alternative)
# GROWW_ACCESS_TOKEN=your_actual_access_token

# Method 3: Username/Password (Legacy)
# GROWW_EMAIL=your_email@example.com
# GROWW_PASSWORD=your_password
# GROWW_TOTP_SECRET=your_totp_secret_if_2fa_enabled

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/stockplay

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Configuration
PORT=3000
NODE_ENV=development
```

## Getting API Credentials

### Method 1: API Key + Secret (Recommended)

1. Go to: https://groww.in/execute-api-keys
2. Log in to your Groww account
3. Click "Generate API key"
4. Enter a name for the key and click Continue
5. Copy the API Key and Secret
6. Update your `.env` file with the credentials

### Method 2: Direct Access Token

1. Log in to your Groww account
2. Click on the profile section at the Right-top of your screen
3. Click on the setting icon in the menu
4. In the navigation list, select "Trading APIs"
5. Click on "Generate API keys" and select "Access Token"
6. Copy the generated access token
7. Update your `.env` file with the token

## Testing the Implementation

### Test Scripts Available:

1. **test-groww-api-key.js** - Tests API key + secret authentication
2. **test-groww-access-token.js** - Tests direct access token authentication
3. **test-typescript-sdk-simple.js** - Tests TypeScript SDK equivalent
4. **test-groww-typescript-sdk.ts** - Full TypeScript SDK test

### Running Tests:

```bash
# Test API key + secret authentication
node test-groww-api-key.js

# Test direct access token
node test-groww-access-token.js

# Test TypeScript SDK equivalent
node test-typescript-sdk-simple.js

# Test full TypeScript SDK (requires ts-node)
npx ts-node test-groww-typescript-sdk.ts
```

## Important Notes

1. **Token Expiry**: Logins will expire at 6AM every day. You need to visit the API keys page and click 'approve' before running login everyday.

2. **Automatic Re-authentication**: The `GrowwApiService` handles token expiry automatically and will re-authenticate when needed.

3. **Rate Limits**: Be mindful of API rate limits. The service includes rate limiting and caching mechanisms.

4. **Error Handling**: The service includes comprehensive error handling and logging.

## API Methods Available

The `GrowwApiService` provides the following methods:

- `getAccessToken(apiKey, apiSecret)` - Static method to get access token
- `authenticate()` - Authenticate with Groww API
- `placeOrder(order)` - Place a trading order
- `modifyOrder(orderId, modifications)` - Modify an existing order
- `cancelOrder(orderId)` - Cancel an order
- `getOrderStatus(orderId)` - Get order status
- `getOrders(status?)` - Get all orders
- `getPositions()` - Get current positions
- `getHoldings()` - Get portfolio holdings
- `getMargins()` - Get account balance/margins
- `getQuote(symbol)` - Get live quote for a symbol
- `getHistoricalData(symbol, fromDate, toDate, interval)` - Get historical data
- `testConnectivity()` - Test API connectivity

## Integration with Strategy System

The `GrowwApiService` is integrated with the strategy system and can be used for automated trading:

```typescript
// In your strategy
const growwApiService = new GrowwApiService(configService, redis, accessToken);

// Place orders based on strategy signals
await growwApiService.placeOrder({
  symbol: 'RELIANCE',
  side: 'BUY',
  quantity: 1,
  orderType: 'MARKET',
  productType: 'CNC'
});
```
