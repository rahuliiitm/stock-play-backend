# Trading Module Architecture

## Overview

The Trading Module is a decoupled, scalable system designed to handle real-time market data feeds, multi-timeframe candle aggregation, and trading strategy execution. It uses existing constructs from the portfolio system while maintaining separation of concerns.

## Architecture Components

### 1. Database Schema (`schemas/candle.schema.ts`)

**Multi-Timeframe Tables:**
- `candles_1m` - 1-minute candles
- `candles_5m` - 5-minute candles
- `candles_15m` - 15-minute candles
- `candles_30m` - 30-minute candles
- `candles_1h` - 1-hour candles
- `candles_4h` - 4-hour candles
- `candles_1d` - Daily candles

**Schema Design:**
```typescript
@Entity('candles_1m')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle1m extends BaseCandle {
  @Column({ type: 'varchar', length: 20 }) symbol: string;
  @Column({ type: 'bigint' }) timestamp: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) open: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) high: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) low: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) close: number;
  @Column({ type: 'bigint' }) volume: number;
}
```

### 2. Live Data Feed Service (`services/live-data-feed.service.ts`)

**Features:**
- Subscription-based data feeds for multiple symbols
- Configurable polling intervals (default: 60 seconds)
- Groww API integration using existing credentials
- Event-driven architecture for real-time processing

**Usage:**
```typescript
const config: SubscriptionConfig = {
  symbols: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'],
  timeframes: ['1m', '5m', '15m', '1h'],
  updateIntervalMs: 30000, // 30 seconds
};

const subscriptionId = await liveDataFeedService.subscribe(config);
```

### 3. Candle Aggregation Service (`services/candle-aggregation.service.ts`)

**Real-time Aggregation Logic:**
- Processes 1-minute candles into higher timeframes
- Redis-based intermediate storage for ongoing aggregations
- Automatic timeframe boundary detection
- Database persistence for completed candles

**Aggregation Flow:**
```
1m Raw Data → Redis Aggregation → PostgreSQL Storage
                    ↓
            Higher Timeframes (5m, 15m, 1h, etc.)
```

**Redis Keys:**
- `trading:candle:{symbol}:{timeframe}` - Current aggregation data
- `trading:last_candle:{symbol}:{timeframe}` - Last completed candle

### 4. Event Listener Service (`services/trading-event-listener.service.ts`)

**Event Flow:**
```
Live Data → Aggregation → Indicators → Strategies → Signals
     ↓          ↓           ↓          ↓          ↓
trading.liveData → trading.candleAggregated → trading.indicatorUpdate → trading.strategyEvaluation → trading.signalGenerated
```

**Features:**
- Event-driven processing pipeline
- Pausable/resumable processing
- Comprehensive logging and error handling
- Extensible for custom trading strategies

### 5. Trading Controller (`controllers/trading.controller.ts`)

**REST API Endpoints:**

```typescript
// Subscription Management
POST   /trading/subscriptions           # Create subscription
GET    /trading/subscriptions           # List all subscriptions
GET    /trading/subscriptions/:id       # Get subscription status
DELETE /trading/subscriptions/:id       # Unsubscribe

// Data Access
GET    /trading/live-data/:symbol       # Get latest live data
GET    /trading/aggregation/:symbol/:timeframe  # Get aggregated data

// Maintenance
POST   /trading/aggregation/flush       # Flush all aggregations
POST   /trading/aggregation/cleanup     # Clean old aggregations
POST   /trading/subscriptions/:id/trigger  # Manual data fetch

// Control
GET    /trading/status                  # Processing status
POST   /trading/pause                   # Pause processing
POST   /trading/resume                  # Resume processing
```

## Data Flow Architecture

### 1. Live Data Ingestion
```
Groww API → LiveDataFeedService → Event Emitter
```

### 2. Real-time Aggregation
```
Event Listener → CandleAggregationService → Redis → PostgreSQL
```

### 3. Strategy Processing
```
Candle Data → Indicator Service → Strategy Service → Signal Generation
```

## Redis Data Structures

### Aggregation Data
```json
{
  "open": 2500.50,
  "high": 2520.00,
  "low": 2495.25,
  "close": 2510.75,
  "volume": 1000000,
  "count": 5,
  "startTime": 1640995200000
}
```

### Live Data Cache
```json
{
  "symbol": "RELIANCE",
  "timestamp": 1640995260000,
  "price": 2510.75,
  "volume": 100000,
  "exchange": "NSE",
  "segment": "CASH"
}
```

## Configuration Options

### Timeframe Configuration
```typescript
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;
```

### Aggregation Settings
```typescript
const AGGREGATION_CONFIG = {
  redisTTL: 24 * 60 * 60, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};
```

## Usage Examples

### Basic Subscription
```typescript
const subscription = await fetch('/trading/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: ['RELIANCE', 'TCS'],
    timeframes: ['1m', '5m', '15m'],
    updateIntervalMs: 30000
  })
});
```

### Manual Data Fetch
```typescript
await fetch(`/trading/subscriptions/${subscriptionId}/trigger`, {
  method: 'POST'
});
```

### Get Aggregated Data
```typescript
const data = await fetch('/trading/aggregation/RELIANCE/15m');
const aggregated = await data.json();
```

## Integration Points

### With Existing Indicators Module
- Candle data feeds into indicator calculations
- Multi-timeframe support for indicators
- Event-driven updates for real-time signals

### With Existing Portfolio Module
- Trading signals can trigger portfolio actions
- Risk management integration
- Position sizing based on portfolio allocation

### With Existing Cache System
- Redis integration for high-performance caching
- Shared cache keys for consistency
- TTL-based data expiration

## Monitoring & Maintenance

### Health Checks
- Subscription status monitoring
- Data flow validation
- Error rate tracking
- Performance metrics

### Maintenance Tasks
- Aggregation cleanup (old data removal)
- Redis memory management
- Database optimization
- Failed subscription recovery

## Performance Considerations

### Redis Optimization
- TTL-based expiration for aggregations
- Memory-efficient data structures
- Connection pooling for high throughput

### Database Optimization
- Partitioning by symbol for large datasets
- Index optimization for time-based queries
- Batch operations for bulk inserts

### Rate Limiting
- API rate limiting (300 requests/minute)
- Subscription-based throttling
- Error handling and retry logic

## Error Handling

### Graceful Degradation
- Failed API calls don't stop processing
- Redis failures fall back to direct database writes
- Subscription failures are isolated

### Recovery Mechanisms
- Automatic reconnection for failed subscriptions
- Data consistency checks and repairs
- Event replay for missed data points

## Future Extensions

### WebSocket Support
- Real-time WebSocket connections for instant data
- Fallback to polling during connection issues
- Client-side subscription management

### Advanced Strategies
- Machine learning-based strategy signals
- Multi-timeframe strategy combinations
- Risk-adjusted position sizing

### Backtesting Framework
- Historical data replay for strategy testing
- Performance metrics calculation
- Strategy optimization tools

## Testing Strategy

### Unit Tests
- Service method testing with mocks
- Aggregation logic validation
- Event handling verification

### Integration Tests
- End-to-end data flow testing
- API endpoint validation
- Database interaction testing

### E2E Tests
- Complete subscription lifecycle
- Real-time data processing
- Error scenario handling

## Deployment Considerations

### Scalability
- Horizontal scaling with multiple instances
- Redis cluster for high availability
- Database read replicas for reporting

### Monitoring
- Application performance monitoring
- Error tracking and alerting
- Data quality monitoring

### Security
- API authentication and authorization
- Rate limiting and abuse prevention
- Secure credential management

This architecture provides a robust, scalable foundation for real-time trading operations while maintaining clean separation of concerns and extensibility for future enhancements.
