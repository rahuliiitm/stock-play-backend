# Backtest Module - Financial Safety First

This module provides comprehensive backtesting capabilities with **strict financial safety measures** to protect users from dangerous configurations that could lead to financial losses.

## 🛡️ Safety Features

### Critical Safety Checks
- **Unlimited Risk Prevention**: Blocks backtests with `maxLossPerLot = 0`
- **Excessive Pyramiding Protection**: Limits `maxLots` to prevent over-leveraging
- **Data Quality Validation**: Ensures sufficient and clean historical data
- **Circuit Breakers**: Stops backtest if drawdown exceeds 50%
- **Configuration Validation**: Prevents invalid parameter combinations

### Financial Protection
- **Risk Limits**: Enforces maximum loss per trade
- **Position Sizing**: Limits trade size to 10% of balance
- **Drawdown Monitoring**: Real-time drawdown tracking with automatic stops
- **Balance Validation**: Ensures reasonable initial balance ranges

## 🏗️ Architecture

### Module Structure
```
backtest/
├── controllers/
│   ├── backtest.controller.ts           # Main backtest API
│   └── backtest-validation.controller.ts # Validation & safety API
├── services/
│   ├── backtest-orchestrator.service.ts # Main orchestration
│   ├── backtest-validation.service.ts   # Configuration validation
│   ├── backtest-safety.service.ts      # Safety checks
│   ├── backtest-data.service.ts         # Data preparation
│   └── backtest-metrics.service.ts     # Performance metrics
├── entities/
│   ├── backtest-run.entity.ts          # Backtest run records
│   ├── backtest-result.entity.ts       # Result snapshots
│   └── backtest-trade.entity.ts        # Individual trades
└── interfaces/
    └── backtest-config.interface.ts    # Type definitions
```

### Black Box Boundaries
- **Data Layer**: Abstract `MarketDataProvider` interface
- **Execution Layer**: Abstract `OrderExecutionProvider` interface  
- **Strategy Layer**: Pure calculation engine (no external dependencies)
- **Safety Layer**: Independent validation and protection

## 🚀 Usage

### Environment Setup
```bash
# For backtesting with CSV data
export DATA_PROVIDER_MODE=csv
export CSV_DATA_DIR=./data
export ORDER_EXECUTION_MODE=mock

# For live trading (production)
export DATA_PROVIDER_MODE=groww
export ORDER_EXECUTION_MODE=groww
```

### API Endpoints

#### Run Backtest
```bash
POST /api/backtest/run
{
  "symbol": "NIFTY",
  "timeframe": "15m",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 1000000,
  "strategyConfig": { ... }
}
```

#### Validate Configuration
```bash
POST /api/backtest/validation/config
{
  "symbol": "NIFTY",
  "timeframe": "15m",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 1000000,
  "strategyConfig": { ... }
}
```

#### Safety Check
```bash
POST /api/backtest/validation/safety-check
{
  "symbol": "NIFTY",
  "timeframe": "15m",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 1000000,
  "strategyConfig": { ... }
}
```

## 🔒 Safety Guidelines

### Critical Rules (Backtest Blocked)
- ❌ `maxLossPerLot = 0` (unlimited risk)
- ❌ `maxLots > 15` (excessive pyramiding)
- ❌ Future dates in range
- ❌ No data available
- ❌ Initial balance ≤ 0

### High Severity (Proceed with Caution)
- ⚠️ No gap filtering enabled
- ⚠️ Extreme RSI thresholds (< 20 or > 80)
- ⚠️ Very high initial balance (> ₹1 crore)
- ⚠️ Excessive pyramiding multiplier (> 2)

### Medium Severity (Review Recommended)
- ℹ️ Short date range (< 30 days)
- ℹ️ Old data (> 1 year)
- ℹ️ Limited trade sample (< 30 trades)
- ℹ️ High volatility detected

## 📊 Performance Metrics

### Risk Metrics
- **Max Drawdown**: Maximum peak-to-trough decline
- **VaR (95%)**: Value at Risk at 95% confidence
- **Sharpe Ratio**: Risk-adjusted returns
- **Sortino Ratio**: Downside risk-adjusted returns
- **Calmar Ratio**: Return vs max drawdown

### Performance Metrics
- **Total Return**: Absolute return percentage
- **Annualized Return**: Yearly return rate
- **Volatility**: Return standard deviation
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit / gross loss

### Trade Analysis
- **Total Trades**: Number of executed trades
- **Average Duration**: Mean trade holding period
- **Consecutive Wins/Losses**: Maximum streaks
- **Trades per Day/Week/Month**: Trading frequency

## 🧪 Testing Strategy

### Unit Testing
- **Interface Testing**: Test all public APIs
- **Black Box Validation**: Test without knowing implementation
- **Replacement Testing**: Ensure modules can be swapped
- **Error Boundary Testing**: Test failure scenarios

### Integration Testing
- **Data Flow Testing**: CSV → Strategy → Execution
- **Safety Check Testing**: Validate all protection mechanisms
- **Performance Testing**: Large dataset handling
- **Error Recovery Testing**: Graceful failure handling

### Financial Safety Testing
- **Dangerous Config Testing**: Ensure blocked configurations are rejected
- **Circuit Breaker Testing**: Verify automatic stops work
- **Risk Limit Testing**: Confirm position sizing limits
- **Drawdown Protection Testing**: Validate drawdown monitoring

## 🚨 Financial Health Protection

### Pre-Backtest Validation
1. **Configuration Validation**: Check all parameters
2. **Safety Assessment**: Run comprehensive safety checks
3. **Data Quality Check**: Validate historical data
4. **Risk Assessment**: Calculate potential risks

### During Backtest Monitoring
1. **Real-time Drawdown Tracking**: Monitor equity curve
2. **Position Size Limits**: Enforce 10% max per trade
3. **Circuit Breaker**: Stop if drawdown > 50%
4. **Error Handling**: Graceful failure recovery

### Post-Backtest Analysis
1. **Performance Metrics**: Comprehensive analysis
2. **Risk Assessment**: Identify potential issues
3. **Recommendations**: Suggest improvements
4. **Safety Report**: Document all safety checks

## 📁 Data Requirements

### CSV File Format
```
./data/
├── NIFTY_15m.csv          # NIFTY 15-minute candles
├── NIFTY_5m.csv           # NIFTY 5-minute candles
├── option_chain_NIFTY.csv # Option chain data
└── README.md              # Data format documentation
```

### Required Columns
- `timestamp`: Date and time
- `open`, `high`, `low`, `close`: OHLC prices
- `volume`: Trading volume (optional)

## 🔧 Configuration Examples

### Safe Configuration
```json
{
  "symbol": "NIFTY",
  "timeframe": "15m",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 1000000,
  "strategyConfig": {
    "emaFastPeriod": 9,
    "emaSlowPeriod": 20,
    "atrPeriod": 14,
    "minGapThreshold": 0,
    "minGapMultiplier": 0.3,
    "rsiThreshold": 50,
    "adxThreshold": 25,
    "pyramiding": {
      "multiplier": 0.6,
      "maxLots": 3
    },
    "risk": {
      "maxLossPerLot": 10000,
      "trailingAtrMultiplier": 1
    }
  }
}
```

### Dangerous Configuration (BLOCKED)
```json
{
  "strategyConfig": {
    "risk": {
      "maxLossPerLot": 0  // ❌ BLOCKED: Unlimited risk
    },
    "pyramiding": {
      "maxLots": 20       // ❌ BLOCKED: Excessive pyramiding
    }
  }
}
```

## 🎯 Key Benefits

### Financial Safety
- **Zero Risk of Unlimited Losses**: All dangerous configs blocked
- **Automatic Protection**: Circuit breakers and limits
- **Comprehensive Validation**: Multi-layer safety checks
- **Clear Warnings**: User-friendly safety messages

### Testing Excellence
- **Complete Isolation**: Backtest module independent
- **Mock Data Support**: CSV-based testing
- **Mock Execution**: Safe order simulation
- **Comprehensive Metrics**: Detailed performance analysis

### Developer Experience
- **Clear APIs**: Well-documented interfaces
- **Safety First**: Protection built-in
- **Easy Testing**: Simple configuration
- **Rich Feedback**: Detailed validation results

---

**⚠️ IMPORTANT**: This module is designed to protect financial health. All dangerous configurations are blocked by default. Always validate configurations before running backtests.
