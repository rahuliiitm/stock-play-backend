# CSV Data Format for Backtesting

This directory contains CSV files for backtesting the trading strategies.

## File Naming Convention

Files should be named using the format: `SYMBOL_TIMEFRAME.csv`

Examples:
- `NIFTY_15m.csv` - NIFTY 15-minute candles
- `NIFTY_5m.csv` - NIFTY 5-minute candles
- `BANKNIFTY_15m.csv` - BANKNIFTY 15-minute candles

## CSV Format

### OHLC Data Format
```csv
timestamp,open,high,low,close,volume
2024-01-01 09:15:00,24000,24050,23980,24020,1500000
2024-01-01 09:30:00,24020,24080,24010,24070,1200000
```

### Alternative Date Format
```csv
date,open,high,low,close,volume
2024-01-01 09:15:00,24000,24050,23980,24020,1500000
2024-01-01 09:30:00,24020,24080,24010,24070,1200000
```

## Required Columns

- `timestamp` or `date`: Date and time in YYYY-MM-DD HH:MM:SS format
- `open`: Opening price
- `high`: Highest price
- `low`: Lowest price
- `close`: Closing price
- `volume`: Trading volume (optional, defaults to 0)

## Option Chain Data Format (Optional)

File naming: `option_chain_SYMBOL.csv`

```csv
expiry,strike,type,symbol,ltp,volume,oi,bid,ask
25SEP24,24000,CE,NIFTY25SEP24000CE,150.5,50000,1000000,150.0,151.0
25SEP24,24000,PE,NIFTY25SEP24000PE,120.5,45000,900000,120.0,121.0
```

## Usage

1. Place CSV files in this directory
2. Set environment variables:
   ```bash
   export DATA_PROVIDER_MODE=csv
   export CSV_DATA_DIR=./data
   ```
3. Run backtests via API or direct service calls

## Data Sources

You can obtain historical data from:
- NSE official website
- Financial data providers (Yahoo Finance, Alpha Vantage, etc.)
- Broker APIs (historical data endpoints)
- Third-party data vendors

## Notes

- Ensure data is clean and sorted by timestamp
- Missing volume data will default to 0
- All prices should be in INR
- Timestamps should be in IST (Indian Standard Time)
- Remove any header rows or metadata before the actual data
