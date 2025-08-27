# Extensible Indicator System

## 🎯 Overview

A **pluggable and extensible indicator library** that calculates technical indicators for stocks independently of portfolios. The system uses the `technicalindicators` library and provides a clean interface for adding new indicators.

---

## 🏗️ Architecture

### **Core Components**

1. **IndicatorProvider Interface** - Contract for all indicator implementations
2. **IndicatorProviderRegistry** - Manages and registers indicator providers
3. **IndicatorCalculationService** - Orchestrates calculations and storage
4. **Database Entities** - Stores configurations and calculated values
5. **REST API** - Exposes indicator functionality

---

## 📊 Available Indicators

### **1. RSI (Relative Strength Index)**
```typescript
{
  name: 'RSI',
  description: 'Momentum oscillator that measures speed and change of price movements',
  requiredParameters: ['period'],
  optionalParameters: ['overbought', 'oversold'],
  minDataPoints: 14
}
```

### **2. SMA (Simple Moving Average)**
```typescript
{
  name: 'SMA',
  description: 'Average of prices over a specified period',
  requiredParameters: ['period'],
  optionalParameters: [],
  minDataPoints: 10
}
```

### **3. MACD (Moving Average Convergence Divergence)**
```typescript
{
  name: 'MACD',
  description: 'Trend-following momentum indicator',
  requiredParameters: ['fastPeriod', 'slowPeriod'],
  optionalParameters: ['signalPeriod'],
  minDataPoints: 26
}
```

### **4. Bollinger Bands**
```typescript
{
  name: 'BOLLINGER_BANDS',
  description: 'Volatility indicator with upper and lower bands',
  requiredParameters: ['period'],
  optionalParameters: ['stdDev'],
  minDataPoints: 20
}
```

---

## 🔧 Database Schema

### **IndicatorConfig Entity**
```typescript
@Entity('indicator_configs')
export class IndicatorConfig {
  id: string
  symbol: string
  indicator_name: string
  parameters: IndicatorParams
  is_active: boolean
  lookback_period: number
  interval: string
  description: string
  created_at: Date
  updated_at: Date
}
```

### **IndicatorValue Entity**
```typescript
@Entity('indicator_values')
export class IndicatorValue {
  id: string
  symbol: string
  indicator_name: string
  value: number
  additional_data: Record<string, any>
  calculated_at: Date
  interval: string
  lookback_period: number
  parameters_used: Record<string, any>
  created_at: Date
}
```

---

## 🚀 API Endpoints

### **Indicator Management**
```typescript
// Get available indicators
GET /indicators/available

// Get indicator configs for a symbol
GET /indicators/configs/:symbol

// Add indicator config
POST /indicators/configs/:symbol
{
  "indicatorName": "RSI",
  "parameters": { "period": 14 },
  "description": "RSI for RELIANCE"
}

// Update indicator config
PUT /indicators/configs/:id
{
  "parameters": { "period": 21 }
}

// Remove indicator config
DELETE /indicators/configs/:id
```

### **Indicator Values**
```typescript
// Get latest indicator value
GET /indicators/values/:symbol/:indicatorName

// Get all latest indicator values for a symbol
GET /indicators/values/:symbol

// Get indicator history
GET /indicators/history/:symbol/:indicatorName?limit=100
```

### **Calculation**
```typescript
// Calculate specific indicator
POST /indicators/calculate/:symbol/:indicatorName
{
  "period": 14
}

// Calculate all indicators for a symbol
POST /indicators/calculate/:symbol

// Calculate all indicators for all symbols
POST /indicators/calculate-all
```

---

## 🔌 Adding New Indicators

### **Step 1: Create Indicator Provider**
```typescript
// src/modules/indicators/providers/ema.provider.ts
import { IndicatorProvider, IndicatorResult } from '../indicator-provider.interface'
import { EMA } from 'technicalindicators'

export class EmaProvider implements IndicatorProvider {
  name = 'EMA'
  description = 'Exponential Moving Average'
  requiredParameters = ['period']
  optionalParameters = []
  minDataPoints = 10

  calculate(candles: Candle[], parameters: Record<string, any>): IndicatorResult | null {
    const period = parameters.period || 20
    
    const emaValues = EMA.calculate({
      values: candles.map(c => c.close),
      period: period
    })

    if (emaValues.length === 0) return null

    return {
      value: emaValues[emaValues.length - 1],
      additionalData: {
        period,
        allValues: emaValues
      },
      timestamp: new Date(candles[candles.length - 1].time)
    }
  }
}
```

### **Step 2: Register Provider**
```typescript
// src/modules/indicators/indicator-provider-registry.service.ts
constructor() {
  // Register default providers
  this.register(new RsiProvider())
  this.register(new SmaProvider())
  this.register(new MacdProvider())
  this.register(new BollingerBandsProvider())
  this.register(new EmaProvider()) // Add new provider
}
```

### **Step 3: Use the Indicator**
```typescript
// Add configuration
POST /indicators/configs/RELIANCE
{
  "indicatorName": "EMA",
  "parameters": { "period": 20 },
  "description": "20-day EMA for RELIANCE"
}

// Calculate
POST /indicators/calculate/RELIANCE/EMA

// Get value
GET /indicators/values/RELIANCE/EMA
```

---

## ⏰ Scheduled Operations

### **Automatic Calculation**
```typescript
@Cron(CronExpression.EVERY_HOUR)
async scheduledIndicatorCalculation(): Promise<void> {
  await this.calculateAllIndicators()
}
```

### **Calculation Flow**
1. **Every Hour**: Calculate all active indicators for all symbols
2. **On Demand**: Calculate specific indicators via API
3. **Real-time**: Get latest calculated values instantly

---

## 📈 Usage Examples

### **1. Setup RSI for RELIANCE**
```bash
# Add RSI configuration
curl -X POST http://localhost:3000/indicators/configs/RELIANCE \
  -H "Content-Type: application/json" \
  -d '{
    "indicatorName": "RSI",
    "parameters": { "period": 14, "overbought": 70, "oversold": 30 },
    "description": "14-day RSI with 70/30 levels"
  }'

# Calculate RSI
curl -X POST http://localhost:3000/indicators/calculate/RELIANCE/RSI

# Get RSI value
curl http://localhost:3000/indicators/values/RELIANCE/RSI
```

### **2. Setup Multiple Indicators**
```bash
# Add SMA
curl -X POST http://localhost:3000/indicators/configs/RELIANCE \
  -d '{"indicatorName": "SMA", "parameters": {"period": 20}}'

# Add MACD
curl -X POST http://localhost:3000/indicators/configs/RELIANCE \
  -d '{"indicatorName": "MACD", "parameters": {"fastPeriod": 12, "slowPeriod": 26}}'

# Calculate all indicators
curl -X POST http://localhost:3000/indicators/calculate/RELIANCE

# Get all values
curl http://localhost:3000/indicators/values/RELIANCE
```

### **3. Get Indicator History**
```bash
# Get last 50 RSI values
curl "http://localhost:3000/indicators/history/RELIANCE/RSI?limit=50"
```

---

## 🔍 Advanced Features

### **1. Additional Data**
Each indicator returns rich additional data:

```typescript
// RSI Response
{
  "value": 65.4,
  "additionalData": {
    "overbought": 70,
    "oversold": 30,
    "isOverbought": false,
    "isOversold": false,
    "allValues": [45.2, 52.1, 58.9, 65.4]
  }
}

// MACD Response
{
  "value": 12.5,
  "additionalData": {
    "macd": 12.5,
    "signal": 8.2,
    "histogram": 4.3,
    "isBullish": true,
    "isBearish": false
  }
}
```

### **2. Parameter Validation**
```typescript
// Automatic validation of required parameters
const provider = this.providerRegistry.get('RSI')
for (const param of provider.requiredParameters) {
  if (!(param in parameters)) {
    throw new Error(`Missing required parameter: ${param}`)
  }
}
```

### **3. Data Point Requirements**
```typescript
// Automatic check for minimum data points
if (candles.length < provider.minDataPoints) {
  return null // Insufficient data
}
```

---

## 🎛️ Configuration Management

### **Active/Inactive Indicators**
```typescript
// Deactivate indicator
PUT /indicators/configs/:id
{
  "is_active": false
}

// Reactivate indicator
PUT /indicators/configs/:id
{
  "is_active": true
}
```

### **Parameter Updates**
```typescript
// Update RSI period
PUT /indicators/configs/:id
{
  "parameters": { "period": 21, "overbought": 75, "oversold": 25 }
}
```

---

## 📊 Performance & Scalability

### **Efficient Storage**
- **Indexed Queries**: Fast retrieval by symbol and indicator
- **Latest Values**: Optimized queries for current values
- **Historical Data**: Efficient time-series storage

### **Caching Strategy**
- **Redis Integration**: Cache calculated values
- **TTL Management**: Automatic cache expiration
- **Batch Operations**: Efficient bulk calculations

### **Scalability Features**
- **Independent Calculations**: Each symbol/indicator calculated separately
- **Parallel Processing**: Multiple indicators calculated concurrently
- **Resource Management**: Rate limiting and error handling

---

## 🔧 Integration with Existing Systems

### **Stock Data Integration**
```typescript
// Uses existing historical data service
const history = await this.quotesService.getHistory(
  symbol, 
  startDate.toISOString(), 
  endDate.toISOString(), 
  1440 // 1 day interval
)
```

### **Portfolio Integration (Future)**
```typescript
// Can be used by portfolio services
const rsiValue = await this.indicatorService.getLatestIndicatorValue('RELIANCE', 'RSI')
if (rsiValue.value < 30) {
  // Oversold condition - potential buy signal
}
```

---

## 🚀 Benefits

### **1. Extensibility**
- ✅ **Easy to Add**: Simple interface for new indicators
- ✅ **Pluggable**: Drop-in new indicator providers
- ✅ **Standardized**: Consistent API across all indicators

### **2. Performance**
- ✅ **Efficient**: Uses proven technicalindicators library
- ✅ **Cached**: Redis caching for fast access
- ✅ **Scheduled**: Automated calculations

### **3. Flexibility**
- ✅ **Configurable**: Custom parameters for each indicator
- ✅ **Symbol Independent**: Works with any stock symbol
- ✅ **Portfolio Agnostic**: Not tied to specific portfolios

### **4. Production Ready**
- ✅ **Error Handling**: Graceful degradation
- ✅ **Validation**: Parameter and data validation
- ✅ **Monitoring**: Comprehensive logging
- ✅ **API**: RESTful endpoints

---

## 🎯 Summary

The **Extensible Indicator System** provides:

- ✅ **4 Built-in Indicators**: RSI, SMA, MACD, Bollinger Bands
- ✅ **Easy Extension**: Simple interface for new indicators
- ✅ **Real-time Data**: Uses existing stock data services
- ✅ **Scheduled Updates**: Automated hourly calculations
- ✅ **Rich API**: Complete REST API for management
- ✅ **Production Ready**: Error handling, validation, monitoring

**The system is ready for production use and can be easily extended with new indicators!** 🚀
