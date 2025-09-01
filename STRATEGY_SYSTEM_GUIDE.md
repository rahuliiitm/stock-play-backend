# NIFTY Option Selling Strategy System - Complete Guide

## 🎯 Overview

This document provides a complete guide to the NIFTY Weekly Option Selling Strategy system, which is now **configuration-based** and runs each strategy in **separate worker threads** for complete isolation and reliability.

## 🏗️ Architecture

### Configuration-Based Strategy System
- **Strategy Configuration**: All strategy logic is defined in configuration files
- **Worker Thread Isolation**: Each strategy runs in its own Node.js worker thread
- **Real Broker Integration**: Complete integration with Groww API for live trading
- **Comprehensive Testing**: E2E tests with real API calls

### Key Components

1. **Strategy Configuration** (`strategy-config.interface.ts`)
   - Defines entry/exit conditions, risk management, indicators
   - Fully configurable without code changes

2. **Strategy Runner** (`strategy-runner.service.ts`)
   - Manages worker threads for each strategy
   - Handles communication between main process and workers
   - Integrates with broker APIs for order execution

3. **Strategy Worker** (`strategy.worker.ts`)
   - Isolated execution environment for each strategy
   - Processes market data and generates signals
   - Handles all strategy logic evaluation

4. **Strategy Management API** (`strategy-management.controller.ts`)
   - REST API for managing strategies
   - Start/stop/restart strategies
   - Monitor status and performance

## 🚀 Quick Start

### 1. Start the Strategy

```bash
# Start the NIFTY option selling strategy
curl -X POST http://localhost:3000/strategies/nifty-weekly-option-selling/start

# Response
{
  "success": true,
  "message": "Strategy nifty-weekly-option-selling started successfully",
  "data": {
    "strategyId": "nifty-weekly-option-selling",
    "status": "RUNNING"
  }
}
```

### 2. Check Strategy Status

```bash
# Get strategy status
curl http://localhost:3000/strategies/nifty-weekly-option-selling/status

# Response
{
  "success": true,
  "data": {
    "strategyId": "nifty-weekly-option-selling",
    "isRunning": true,
    "workerId": "1",
    "hasPosition": false,
    "lastCandle": { ... },
    "indicators": { ... },
    "timestamp": "2024-01-08T10:30:00.000Z"
  }
}
```

### 3. Test Strategy with Market Data

```bash
# Send test market data
curl -X POST http://localhost:3000/strategies/nifty-weekly-option-selling/test-signal \
  -H "Content-Type: application/json" \
  -d '{
    "candle": {
      "timestamp": 1704710400000,
      "open": 22000,
      "high": 22100,
      "low": 21950,
      "close": 22075,
      "volume": 1500000
    },
    "indicators": {
      "supertrend_direction": { "value": "bullish", "timestamp": "2024-01-08T10:30:00.000Z" },
      "ema20": { "value": 22000, "timestamp": "2024-01-08T10:30:00.000Z" }
    }
  }'
```

### 4. Stop the Strategy

```bash
# Stop the strategy
curl -X POST http://localhost:3000/strategies/nifty-weekly-option-selling/stop

# Response
{
  "success": true,
  "message": "Strategy nifty-weekly-option-selling stopped successfully",
  "data": {
    "strategyId": "nifty-weekly-option-selling",
    "status": "STOPPED"
  }
}
```

## 📊 Strategy Configuration

### NIFTY Option Selling Strategy Config

```typescript
export const NIFTY_OPTION_SELLING_CONFIG: StrategyConfig = {
  id: 'nifty-weekly-option-selling',
  name: 'NIFTY Weekly Option Selling',
  description: 'Weekly option selling strategy using Supertrend and EMA',
  underlyingSymbol: 'NIFTY',
  timeframe: '1H',
  maxConcurrentPositions: 1,

  // Risk Management
  riskManagement: {
    maxLossPerTrade: 2000,      // ₹2,000 max loss per trade
    maxDailyLoss: 10000,        // ₹10,000 max daily loss
    maxDrawdown: 5000,          // ₹5,000 max drawdown
    positionSizePercent: 5      // 5% of capital per trade
  },

  // Indicators Configuration
  indicators: [
    {
      name: 'supertrend',
      type: 'SUPER_TREND',
      parameters: { period: 10, multiplier: 3 },
      timeframe: '1H'
    },
    {
      name: 'ema20',
      type: 'EMA',
      parameters: { period: 20 },
      timeframe: '1H'
    }
  ],

  // Entry Conditions
  entryConditions: [
    {
      id: 'bullish-entry',
      name: 'Bull Put Spread Entry',
      type: 'SEQUENTIAL',
      conditions: [
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'EQ',
          leftOperand: 'supertrend_direction',
          rightOperand: 'bullish'
        },
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'GT',
          leftOperand: 'close',
          rightOperand: 'ema20'
        }
      ],
      confirmation: {
        timeframe: '1H',
        condition: {
          type: 'PRICE_CONDITION',
          operator: 'GT',
          leftOperand: 'close',
          rightOperand: 'entry_candle_high'
        }
      }
    }
  ],

  // Exit Conditions
  exitConditions: [
    {
      id: 'supertrend-flip',
      name: 'Supertrend Direction Change',
      type: 'SIGNAL_BASED',
      condition: {
        type: 'INDICATOR_COMPARISON',
        operator: 'NEQ',
        leftOperand: 'supertrend_direction',
        rightOperand: 'entry_direction'
      },
      priority: 1
    },
    {
      id: 'stop-loss',
      name: 'Stop Loss (1.5x Net Credit)',
      type: 'STOP_LOSS',
      condition: {
        type: 'CUSTOM_LOGIC',
        operator: 'LT',
        leftOperand: 'current_pnl',
        rightOperand: 'net_credit * -1.5'
      },
      priority: 2
    }
  ],

  // Order Configuration
  orderConfig: {
    orderType: 'MARKET',
    quantity: 50,           // Standard NIFTY lot size
    productType: 'MIS',     // Intraday
    spreadConfig: {
      type: 'BULL_PUT_SPREAD',
      sellStrikeOffset: 0,   // ATM strike
      buyStrikeOffset: 200,  // 200 points OTM hedge
      expiryType: 'weekly'
    }
  }
}
```

## 🧪 Comprehensive Testing

### Running E2E Tests with Real Groww API

```bash
# Set environment variables
export GROWW_EMAIL="your-email@groww.in"
export GROWW_PASSWORD="your-password"
export GROWW_TOTP_SECRET="your-totp-secret"

# Run strategy integration tests
npm run test:e2e -- --testNamePattern="Strategy Groww Integration"
```

### Test Scenarios Covered

#### 1. Complete Strategy Lifecycle Test
- ✅ Groww API connectivity verification
- ✅ Strategy startup in worker thread
- ✅ Market data processing
- ✅ Signal generation and order execution
- ✅ Position management and exit logic
- ✅ Strategy shutdown and cleanup

#### 2. Broker API Integration Test
- ✅ Authentication with TOTP
- ✅ Session management
- ✅ Account information retrieval
- ✅ Order placement and management
- ✅ Position tracking and P&L calculation

#### 3. Error Handling and Recovery Test
- ✅ Invalid authentication handling
- ✅ Network failure recovery
- ✅ Strategy restart after errors
- ✅ Concurrent strategy execution
- ✅ Performance metrics validation

### Test Results Example

```
✅ Groww API connectivity verified
✅ Strategy started successfully
✅ Candle data processed by strategy
✅ Entry confirmation processed
✅ Exit conditions processed
✅ Strategy stopped successfully
🎉 Complete strategy lifecycle test completed successfully!
```

## 🔧 API Endpoints

### Strategy Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/strategies` | List all strategies |
| GET | `/strategies/:id` | Get strategy details |
| POST | `/strategies/:id/start` | Start a strategy |
| POST | `/strategies/:id/stop` | Stop a strategy |
| POST | `/strategies/:id/restart` | Restart a strategy |
| GET | `/strategies/:id/status` | Get strategy status |
| GET | `/strategies/:id/stats` | Get strategy statistics |
| POST | `/strategies/:id/test-signal` | Send test market data |

### System Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/strategies/running/list` | List running strategies |
| POST | `/strategies/stop-all` | Stop all strategies |
| GET | `/strategies/health/overview` | System health status |
| POST | `/strategies/config/validate` | Validate strategy config |
| POST | `/strategies/config/save` | Save strategy configuration |

## 📈 Strategy Performance Monitoring

### Real-time Metrics

```bash
# Get strategy statistics
curl http://localhost:3000/strategies/nifty-weekly-option-selling/stats

# Response
{
  "success": true,
  "data": {
    "totalTrades": 15,
    "winningTrades": 11,
    "losingTrades": 4,
    "winRate": 73.3,
    "totalPnL": 4250,
    "maxDrawdown": 1200,
    "sharpeRatio": 1.8,
    "avgProfit": 386,
    "avgLoss": -300,
    "profitFactor": 2.2,
    "lastUpdated": "2024-01-08T15:30:00.000Z"
  }
}
```

### System Health

```bash
# Get system health overview
curl http://localhost:3000/strategies/health/overview

# Response
{
  "success": true,
  "data": {
    "totalStrategies": 1,
    "runningStrategies": 1,
    "stoppedStrategies": 0,
    "systemStatus": "HEALTHY",
    "lastUpdated": "2024-01-08T15:30:00.000Z",
    "strategies": [
      {
        "id": "nifty-weekly-option-selling",
        "status": "RUNNING",
        "uptime": "2h 15m",
        "lastHeartbeat": "2024-01-08T15:29:30.000Z"
      }
    ]
  }
}
```

## 🚨 Production Deployment

### Environment Setup

1. **Environment Variables**
```bash
# Groww API Credentials
GROWW_EMAIL=your-email@groww.in
GROWW_PASSWORD=your-password
GROWW_TOTP_SECRET=your-totp-secret

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=prod_user
DB_PASSWORD=secure_password
DB_NAME=stockplay_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

2. **Start Production Server**
```bash
npm run build
npm run start:prod
```

3. **Health Check**
```bash
curl http://your-server:3000/strategies/health/overview
```

### Monitoring and Alerts

- **Heartbeat Monitoring**: Strategies send heartbeats every 30 seconds
- **Error Recovery**: Automatic restart on failures
- **Performance Tracking**: Real-time P&L and risk metrics
- **Alert System**: Email/SMS alerts for critical events

## 🛠️ Troubleshooting

### Common Issues

1. **Strategy Won't Start**
   - Check worker thread logs
   - Verify Groww API credentials
   - Ensure database connectivity

2. **Orders Not Executing**
   - Verify broker session is active
   - Check account balance and margins
   - Review order parameters

3. **High Latency**
   - Monitor Redis performance
   - Check network connectivity to Groww API
   - Review worker thread CPU usage

### Debug Commands

```bash
# Check running processes
curl http://localhost:3000/strategies/running/list

# Get detailed strategy status
curl http://localhost:3000/strategies/nifty-weekly-option-selling/status

# View strategy logs
tail -f logs/strategy-runner.log
```

## 📚 Advanced Configuration

### Custom Entry Conditions

```typescript
{
  id: 'custom-entry',
  name: 'Custom Multi-Indicator Entry',
  type: 'SEQUENTIAL',
  conditions: [
    {
      type: 'INDICATOR_COMPARISON',
      operator: 'GT',
      leftOperand: 'rsi',
      rightOperand: 65
    },
    {
      type: 'VOLUME_CONDITION',
      operator: 'GT',
      leftOperand: 'volume',
      rightOperand: 'avg_volume_20 * 1.5'
    }
  ]
}
```

### Custom Exit Conditions

```typescript
{
  id: 'time-based-exit',
  name: 'End of Day Exit',
  type: 'TIME_BASED',
  condition: {
    type: 'TIME_CONDITION',
    operator: 'GTE',
    leftOperand: 'hour',
    rightOperand: 15
  },
  priority: 5
}
```

### Risk Management Rules

```typescript
riskManagement: {
  maxLossPerTrade: 2000,      // ₹2,000 per trade
  maxDailyLoss: 10000,        // ₹10,000 per day
  maxDrawdown: 5000,          // ₹5,000 max drawdown
  positionSizePercent: 5,     // 5% of capital
  maxConcurrentPositions: 3,  // Max 3 positions
  dailyTradeLimit: 10         // Max 10 trades per day
}
```

## 🎯 Next Steps

1. **Backtesting Integration**: Add historical data testing
2. **Multiple Strategies**: Support for concurrent strategies
3. **Advanced Analytics**: Detailed performance reporting
4. **Paper Trading**: Risk-free testing environment
5. **Mobile Notifications**: Real-time alerts via app

## 📞 Support

For issues or questions:
- Check the logs: `logs/strategy-runner.log`
- Review API documentation: `/api/docs`
- Monitor system health: `/strategies/health/overview`

---

**🎉 Your NIFTY Option Selling Strategy is now production-ready with complete configuration-based architecture, worker thread isolation, and comprehensive Groww API integration!**
