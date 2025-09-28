# EMA-Gap-ATR Strategy v2.2 - Implementation Documentation

## Overview

This document provides comprehensive implementation details for the **EMA-Gap-ATR Trend Pyramiding Strategy v2.2**. This strategy combines Exponential Moving Average (EMA) crossovers, Average True Range (ATR) filtering, RSI momentum confirmation, and intelligent pyramiding for trend-following trading.

## Table of Contents

1. [Strategy Architecture](#strategy-architecture)
2. [Configuration Parameters](#configuration-parameters)
3. [Entry Rules Implementation](#entry-rules-implementation)
4. [Pyramiding Logic](#pyramiding-logic)
5. [Exit Rules Implementation](#exit-rules-implementation)
6. [Risk Management](#risk-management)
7. [Code Examples](#code-examples)
8. [Backtesting Implementation](#backtesting-implementation)
9. [API Usage](#api-usage)

---

## Strategy Architecture

### Core Components

The strategy is implemented across multiple services:

- **`EmaGapAtrStrategyService`**: Main strategy logic and signal generation
- **`BacktestOrchestratorService`**: Backtest execution and trade management
- **`CsvDataProvider`**: Historical data loading for backtesting
- **`MockOrderExecutionProvider`**: Simulated order execution for backtesting

### Signal Types

The strategy generates two types of signals:

1. **ENTRY Signals**: Trigger new position entries
2. **EXIT Signals**: Trigger position exits

---

## Configuration Parameters

### Complete Configuration Interface

```typescript
interface EmaGapAtrConfig {
  // Basic Strategy Info
  id: string;
  name?: string;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

  // EMA Parameters
  emaFastPeriod: number;        // Fast EMA period (default: 9)
  emaSlowPeriod: number;        // Slow EMA period (default: 21)

  // ATR Parameters
  atrPeriod: number;            // ATR calculation period (default: 14)
  atrMultiplierEntry: number;   // ATR multiplier for entry (default: 0.6)
  atrMultiplierUnwind: number;  // ATR multiplier for exit (default: 0.3)

  // Strong Candle Filter
  strongCandleThreshold: number; // Minimum candle strength for gap entries (default: 0.1)

  // Gap Handling
  gapUpDownThreshold: number;   // Minimum gap percentage (default: 0.3)

  // RSI Parameters
  rsiPeriod: number;            // RSI calculation period (default: 14)
  rsiEntryLong: number;         // RSI threshold for long entries (default: 48)
  rsiEntryShort: number;        // RSI threshold for short entries (default: 52)
  rsiExitLong: number;          // RSI threshold for long exits (default: 45)
  rsiExitShort: number;         // RSI threshold for short exits (default: 55)

  // Slope calculation
  slopeLookback: number;        // Periods for slope calculation (default: 3)

  // Capital and Risk Management
  capital: number;              // Available capital (default: 100000)
  maxLossPct: number;           // Maximum loss percentage (default: 0.05)
  positionSize: number;         // Position size per trade (default: 1)
  maxLots: number;             // Maximum pyramiding lots (default: 5)

  // Pyramiding
  pyramidingEnabled: boolean;   // Enable pyramiding (default: true)

  // Exit Mode
  exitMode: 'FIFO' | 'LIFO';   // Exit order (default: 'FIFO')

  // Time-based Exits
  misExitTime: string;          // MIS exit time (default: '15:15')
  cncExitTime: string;         // CNC exit time (default: '15:15')

  // Options (for future use)
  options?: {
    enabled: boolean;
    strikeSelection: {
      callStrikes: ('ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM')[];
      putStrikes: ('ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM')[];
      expiryDays?: number;
    };
    lotSize?: number;
    strikeIncrement?: number;
  };
}
```

### Default Configuration Example

```typescript
const defaultConfig: EmaGapAtrConfig = {
  id: 'debug',
  name: 'Debug Strategy',
  symbol: 'NIFTY',
  timeframe: '15m',
  emaFastPeriod: 9,
  emaSlowPeriod: 21,
  atrPeriod: 14,
  atrMultiplierEntry: 0.6,
  atrMultiplierUnwind: 0.3,
  strongCandleThreshold: 0.1,
  gapUpDownThreshold: 0.3,
  rsiPeriod: 14,
  rsiEntryLong: 48,
  rsiEntryShort: 52,
  rsiExitLong: 45,
  rsiExitShort: 55,
  slopeLookback: 3,
  capital: 100000,
  maxLossPct: 0.05,
  positionSize: 1,
  maxLots: 5,
  pyramidingEnabled: true,
  exitMode: 'FIFO',
  misExitTime: '15:15',
  cncExitTime: '15:15'
};
```

---

## Entry Rules Implementation

### 1. Gap Entry Rules (9:15 AM Candle)

**Purpose**: Capture gap-up/gap-down opportunities at market open.

**Conditions**:
```typescript
// Gap Up Entry (Long)
const gapEntryLong = 
  isMarketOpenCandle &&           // Must be 9:15 AM candle
  isGapUp &&                      // Price gapped up from previous close
  gapPercent >= gapUpDownThreshold &&  // Gap is significant
  candleStrength >= strongCandleThreshold;  // Candle has strong body

// Gap Down Entry (Short)  
const gapEntryShort = 
  isMarketOpenCandle &&           // Must be 9:15 AM candle
  isGapDown &&                    // Price gapped down from previous close
  gapPercent >= gapUpDownThreshold &&  // Gap is significant
  candleStrength >= strongCandleThreshold;  // Candle has strong body
```

**Implementation Details**:
- **Market Open Detection**: `isMarketOpenCandle()` checks for 9:15 AM timestamp
- **Gap Calculation**: `gapPercent = |open - prevClose| / prevClose`
- **Candle Strength**: `candleStrength = |close - open| / (high - low)`

### 2. Standard Entry Rules (EMA Crossovers)

**Purpose**: Enter on fresh EMA crossovers with momentum confirmation.

**Conditions**:
```typescript
// Standard Long Entry
const standardEntryLong = 
  crossedUp &&                    // Fast EMA crossed above Slow EMA
  gapNorm >= atrMultiplierEntry; // Gap is significant relative to ATR

// Standard Short Entry
const standardEntryShort = 
  crossedDown &&                  // Fast EMA crossed below Slow EMA
  gapNorm >= atrMultiplierEntry; // Gap is significant relative to ATR
```

**Implementation Details**:
- **Crossover Detection**: `crossedUp = fastPrev <= slowPrev && fast > slow`
- **Gap Normalization**: `gapNorm = |fast - slow| / atr`
- **No Strong Candle Filter**: Standard entries don't require strong candles

### 3. RSI Confirmation

**Purpose**: Ensure momentum alignment before entry.

**Conditions**:
```typescript
// RSI Entry Conditions
const rsiEntryLong = rsi >= rsiEntryLong;    // RSI above threshold for longs
const rsiEntryShort = rsi <= rsiEntryShort;  // RSI below threshold for shorts
```

### 4. Complete Entry Logic

```typescript
// Entry signals are generated when:
// 1. Gap entries: gapEntry + rsiEntry
// 2. Standard entries: standardEntry + rsiEntry

if (gapEntryLong && rsiEntryLong) {
  signals.push(buildEntrySignal('LONG', config, latestCandle, diagnostics));
}
if (gapEntryShort && rsiEntryShort) {
  signals.push(buildEntrySignal('SHORT', config, latestCandle, diagnostics));
}

if (standardEntryLong && rsiEntryLong) {
  signals.push(buildEntrySignal('LONG', config, latestCandle, diagnostics));
}
if (standardEntryShort && rsiEntryShort) {
  signals.push(buildEntrySignal('SHORT', config, latestCandle, diagnostics));
}
```

---

## Pyramiding Logic

### Pyramiding Rules

**Purpose**: Add to winning positions to maximize trend capture.

**Implementation**:
```typescript
// Check pyramiding limits before entry
if (config.pyramidingEnabled && currentLots >= config.maxLots) {
  this.logger.warn(`Pyramiding limit reached: ${currentLots}/${config.maxLots}`);
  continue;
}

// Track position size
currentLots += quantity;
```

**Key Features**:
- **Maximum Lots**: Configurable limit (default: 5)
- **Position Tracking**: `currentLots` tracks total position size
- **Entry Price Tracking**: First entry price stored for calculations
- **Risk Management**: Each pyramid level adds to total exposure

### Pyramiding Example

```typescript
// Example pyramiding sequence:
// 1. Initial entry: 1 lot at 25000
// 2. First pyramid: 1 lot at 25100 (total: 2 lots)
// 3. Second pyramid: 1 lot at 25200 (total: 3 lots)
// 4. Max reached: No more entries allowed

const activeTrades = [
  { symbol: 'NIFTY', direction: 'LONG', entryPrice: 25000, quantity: 1, entryTime: '09:30' },
  { symbol: 'NIFTY', direction: 'LONG', entryPrice: 25100, quantity: 1, entryTime: '10:00' },
  { symbol: 'NIFTY', direction: 'LONG', entryPrice: 25200, quantity: 1, entryTime: '10:30' }
];
```

---

## Exit Rules Implementation

### 1. EMA Flip Exit

**Purpose**: Exit when trend reverses (EMA crossover in opposite direction).

**Conditions**:
```typescript
// EMA Flip Exits
const emaFlipExitLong = crossedDown && isBearishTrend;   // Fast EMA crosses below Slow EMA
const emaFlipExitShort = crossedUp && isBullishTrend;   // Fast EMA crosses above Slow EMA
```

### 2. RSI Exit

**Purpose**: Exit when momentum weakens.

**Conditions**:
```typescript
// RSI Exit Conditions
const rsiExitLong = rsi <= rsiExitLong;    // RSI below threshold for longs
const rsiExitShort = rsi >= rsiExitShort;  // RSI above threshold for shorts
```

### 3. ATR Contraction Exit

**Purpose**: Exit when volatility contracts significantly.

**Conditions**:
```typescript
// ATR Contraction Exit
const atrContractionExit = gapNorm <= atrMultiplierUnwind;
```

### 4. Time-Based Exit

**Purpose**: Force exit at end of trading session.

**Implementation**:
```typescript
// Time-based exit check
const currentTime = new Date(candles[i].timestamp);
const exitTime = new Date(currentTime);
const [hours, minutes] = config.misExitTime.split(':').map(Number);
exitTime.setHours(hours, minutes, 0, 0);

if (currentTime >= exitTime && activeTrades.length > 0) {
  // Exit all active positions
  for (const trade of activeTrades) {
    // Execute sell orders
  }
}
```

### 5. Complete Exit Logic

```typescript
// Exit signals are generated when ANY of these conditions are met:
if (emaFlipExitLong || rsiExitLong || atrContractionExit) {
  signals.push(buildExitSignal('LONG', config, latestCandle, diagnostics));
}
if (emaFlipExitShort || rsiExitShort || atrContractionExit) {
  signals.push(buildExitSignal('SHORT', config, latestCandle, diagnostics));
}
```

---

## Risk Management

### 1. Capital Protection

**Purpose**: Prevent excessive losses.

**Implementation**:
```typescript
// Capital protection check
const totalPnL = currentEquity - config.initialBalance;
const maxAllowedLoss = -config.initialBalance * config.maxLossPct;

if (totalPnL <= maxAllowedLoss) {
  this.logger.error(`Capital protection triggered: P&L ${totalPnL} below max loss ${maxAllowedLoss}`);
  // Force exit all positions
}
```

### 2. Position Size Limits

**Purpose**: Control individual trade size.

**Implementation**:
```typescript
// Check if we can afford the trade
const tradeCost = entryPrice * quantity;
if (tradeCost > currentBalance * 0.1) {
  this.logger.warn(`Trade rejected: cost ${tradeCost} exceeds 10% of balance`);
  continue;
}
```

### 3. Drawdown Monitoring

**Purpose**: Track and limit maximum drawdown.

**Implementation**:
```typescript
// Update peak balance and drawdown
if (currentEquity > peakBalance) {
  peakBalance = currentEquity;
}
const drawdown = (peakBalance - currentEquity) / peakBalance;
if (drawdown > maxDrawdown) {
  maxDrawdown = drawdown;
}
```

---

## Code Examples

### 1. Strategy Evaluation

```typescript
// Evaluate strategy for a given set of candles
const evaluation = strategyService.evaluate(config, candles);

// Check for signals
if (evaluation.signals.length > 0) {
  for (const signal of evaluation.signals) {
    if (signal.type === 'ENTRY') {
      console.log(`Entry signal: ${signal.data.direction} at ${signal.data.price}`);
    } else if (signal.type === 'EXIT') {
      console.log(`Exit signal: ${signal.data.direction} at ${signal.data.price}`);
    }
  }
}
```

### 2. Backtest Execution

```typescript
// Run a complete backtest
const backtestConfig: BacktestConfig = {
  symbol: 'NIFTY',
  timeframe: '15m',
  startDate: new Date('2025-07-22'),
  endDate: new Date('2025-07-25'),
  initialBalance: 100000,
  strategyConfig: {
    // ... strategy configuration
  }
};

const result = await backtestOrchestrator.runBacktest(backtestConfig);
console.log(`Total return: ${result.totalReturnPercentage}%`);
console.log(`Total trades: ${result.trades.length}`);
```

### 3. Signal Processing

```typescript
// Process signals in backtest
for (const signal of evaluation.signals) {
  if (signal.type === 'ENTRY') {
    // Check pyramiding limits
    if (currentLots >= config.maxLots) {
      continue;
    }
    
    // Execute entry order
    const orderResult = await orderExecution.placeBuyOrder({
      symbol: signal.data.symbol,
      quantity: config.positionSize,
      price: signal.data.price,
      orderType: 'MARKET'
    });
    
    if (orderResult.success) {
      currentLots += config.positionSize;
      activeTrades.push({
        symbol: signal.data.symbol,
        direction: signal.data.direction,
        entryPrice: signal.data.price,
        quantity: config.positionSize,
        entryTime: currentCandle.timestamp
      });
    }
  }
}
```

---

## Backtesting Implementation

### 1. Data Loading

```typescript
// Load historical data
const candles = await dataProvider.getHistoricalCandles(
  config.symbol,
  config.timeframe,
  config.startDate,
  config.endDate
);
```

### 2. Strategy Execution Loop

```typescript
// Process each candle
for (let i = 0; i < candles.length; i++) {
  const currentCandles = candles.slice(0, i + 1);
  
  // Run strategy evaluation
  const evaluation = strategyService.evaluate(config, currentCandles);
  
  // Process signals
  for (const signal of evaluation.signals) {
    // Execute trades based on signals
  }
  
  // Update equity and risk metrics
  const currentEquity = calculateEquity(currentBalance, positions, candles[i]);
}
```

### 3. Trade Tracking

```typescript
// Track active trades
const activeTrades: Trade[] = [];

// When position closes
const completedTrade = {
  entryTime: new Date(trade.entryTime),
  exitTime: new Date(candles[i].timestamp),
  symbol: trade.symbol,
  direction: trade.direction,
  entryPrice: trade.entryPrice,
  exitPrice: candles[i].close,
  quantity: Math.abs(trade.quantity),
  pnl: (candles[i].close - trade.entryPrice) * trade.quantity,
  pnlPercentage: ((candles[i].close - trade.entryPrice) / trade.entryPrice) * 100
};

trades.push(completedTrade);
```

---

## API Usage

### 1. Run NIFTY Backtest

```bash
curl -X POST http://localhost:20003/backtest/run-nifty \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Custom Backtest

```bash
curl -X POST http://localhost:20003/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "NIFTY",
    "timeframe": "15m",
    "startDate": "2025-07-22T00:00:00.000Z",
    "endDate": "2025-07-25T23:59:59.000Z",
    "initialBalance": 100000,
    "strategyConfig": {
      "id": "custom",
      "name": "Custom Strategy",
      "symbol": "NIFTY",
      "timeframe": "15m",
      "emaFastPeriod": 9,
      "emaSlowPeriod": 21,
      "atrPeriod": 14,
      "atrMultiplierEntry": 0.6,
      "atrMultiplierUnwind": 0.3,
      "strongCandleThreshold": 0.1,
      "gapUpDownThreshold": 0.3,
      "rsiPeriod": 14,
      "rsiEntryLong": 48,
      "rsiEntryShort": 52,
      "rsiExitLong": 45,
      "rsiExitShort": 55,
      "slopeLookback": 3,
      "capital": 100000,
      "maxLossPct": 0.05,
      "positionSize": 1,
      "maxLots": 5,
      "pyramidingEnabled": true,
      "exitMode": "FIFO",
      "misExitTime": "15:15",
      "cncExitTime": "15:15"
    }
  }'
```

### 3. Get Example Configuration

```bash
curl -X GET http://localhost:20003/backtest/example-config
```

### 4. Validate Configuration

```bash
curl -X POST http://localhost:20003/backtest/validation/config \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "NIFTY",
    "timeframe": "15m",
    "startDate": "2025-07-22T00:00:00.000Z",
    "endDate": "2025-07-25T23:59:59.000Z",
    "initialBalance": 100000
  }'
```

---

## Key Implementation Features

### 1. Comprehensive Logging

The strategy includes extensive logging for debugging:

```typescript
this.logger.debug(`Diagnostics ${timestamp}: ${JSON.stringify({
  fast, slow, fastPrev, slowPrev,
  fastSlope, gapAbs, gapNorm, atr, rsi, adx,
  candleStrength, gapPercent, isMarketOpenCandle,
  isGapUp, isGapDown, crossedUp, crossedDown,
  isBullishTrend, isBearishTrend,
  gapEntryLong, gapEntryShort,
  standardEntryLong, standardEntryShort,
  rsiEntryLong, rsiEntryShort,
  emaFlipExitLong, emaFlipExitShort,
  atrContractionExit
})}`);
```

### 2. Safety Checks

Multiple safety mechanisms prevent dangerous configurations:

- **Data Validation**: Ensures sufficient historical data
- **Configuration Validation**: Validates all parameters
- **Safety Checks**: Prevents dangerous configurations
- **Capital Protection**: Limits maximum losses

### 3. Modular Architecture

The strategy is built with modularity in mind:

- **Strategy Service**: Pure strategy logic
- **Data Providers**: Pluggable data sources
- **Order Execution**: Pluggable execution providers
- **Backtest Orchestrator**: Coordinates backtesting

### 4. Real-time Monitoring

The implementation includes real-time monitoring:

- **Signal Generation**: Real-time signal detection
- **Position Tracking**: Active trade monitoring
- **Risk Metrics**: Continuous risk assessment
- **Performance Metrics**: Real-time performance tracking

---

## Conclusion

The EMA-Gap-ATR Strategy v2.2 implementation provides a robust, well-tested framework for trend-following trading with comprehensive risk management, intelligent pyramiding, and multiple exit strategies. The modular architecture ensures flexibility and maintainability while the extensive logging and safety checks provide confidence in the system's reliability.

The strategy successfully combines technical analysis indicators with practical risk management to create a systematic approach to trading that can be backtested, validated, and deployed with confidence.
