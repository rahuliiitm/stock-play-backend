Strategy Documentation: EMA-Gap + ATR Pyramiding Trend-Following Algo (Config-Driven)
1️⃣ Strategy Overview
This is a trend-following intraday strategy designed for lower timeframes (5–15 min).
It aims to:
Detect micro-trends using EMA crossover and EMA gap.
Filter noise using ATR-based gap threshold and RSI/ADX filters.
Scale positions during trends using pyramiding rules.
Exit on trend reversal using EMA crossover or ATR-based trailing stop.
Config-Driven: All parameters are externally configurable (JSON, YAML, DB, etc.), including symbol, timeframe, EMA periods, ATR multiplier, thresholds, and max lots.
2️⃣ Core Configurable Parameters
Parameter	Purpose	Formula / Logic	Example	Config-Driven?
EMA_F / EMA_S	Detect trend	EMA of close price	9 / 20	✅
slope_n	Trend slope over n candles	(EMA_t - EMA_{t-n}) / n	6.67 pts/candle	✅
gap_abs	Absolute EMA gap		EMA_F - EMA_S	
gap_norm	EMA gap normalized by ATR	gap_abs / ATR	2	✅
ATR_period	Volatility measure	14-period ATR	10 points	✅
min_threshold	Minimum EMA gap to enter	max(k*ATR, absolute_price_gap)	60 points	✅
multiplier	Pyramiding distance factor	NextLotEntry = LastEntryPrice + multiplier*ATR	20,006	✅
max_lots	Max pyramiding	Limit number of added positions	3 lots	✅
RSI_period	Momentum filter	14-period RSI	RSI > 50	✅
RSI_threshold	RSI entry filter	RSI ≥ threshold	50	✅
ADX_period	Trend strength filter	14-period ADX	ADX > 25	✅
ADX_threshold	ADX entry filter	ADX ≥ threshold	25	✅
symbol	Stock / future to trade	e.g., NIFTY, BANKNIFTY	NIFTY 50	✅
timeframe	Candle timeframe	e.g., 5min, 15min	15 min	✅
3️⃣ Entry Conditions
Buy / Put (uptrend) Example:
EMA crossover: EMA_F crosses above EMA_S.
EMA gap: gap_abs ≥ min_threshold OR gap_norm ≥ k.
Momentum filter: RSI ≥ RSI_threshold AND ADX ≥ ADX_threshold.
Slope filter: slope_n ≥ slope_min (optional).
Pyramiding: First lot entered when all above conditions met.
All thresholds (k, RSI_threshold, ADX_threshold, slope_min) are config-driven.
4️⃣ Pyramiding Rules
Add next lot when price moves multiplier × ATR from last lot entry.
Continue until max_lots is reached.
Formula: NextLotEntry=LastEntryPrice+multiplier⋅ATR
multiplier and max_lots are config-driven.
5️⃣ Exit Rules
Trend reversal: EMA_F crosses EMA_S in opposite direction.
Optional trailing stop: Exit if price reverses by X × ATR from peak during trend.
Stop-loss: Max loss per trade / per lot (configurable).
P&L Calculation:
P&L = \sum_{i=1}^{lots} (ExitPrice - EntryPrice_i) \times LotSize
Trailing stop distance X × ATR is configurable.
6️⃣ Forward Testing Guidelines
Start with 1 lot only.
Track: EMA gap, ATR, slope, RSI, ADX, number of pyramids, P&L per trade.
Adjust parameters weekly using forward test data.
Avoid scaling capital until parameters are validated.
7️⃣ Algorithmic Flow (Step by Step)
Load Config: Symbol, timeframe, EMA periods, ATR period, multipliers, thresholds, max lots.
Calculate Indicators: EMA_F, EMA_S, ATR, RSI, ADX.
Check entry condition: EMA crossover + gap + momentum + slope.
Enter first lot if conditions met.
Check for pyramiding: If price moves multiplier × ATR from last lot, add next lot (up to max_lots).
Monitor exit conditions: Opposite EMA crossover OR ATR-based trailing stop.
Close position: Calculate realized P&L.
Repeat for next candle.
8️⃣ Example (Config Driven)
{
  "symbol": "NIFTY",
  "timeframe": "15min",
  "EMA_F": 9,
  "EMA_S": 20,
  "ATR_period": 14,
  "RSI_period": 14,
  "RSI_threshold": 50,
  "ADX_period": 14,
  "ADX_threshold": 25,
  "slope_n": 3,
  "slope_min": 2,
  "multiplier": 0.6,
  "max_lots": 3,
  "min_threshold": 0.3,
  "trailing_stop_ATR_multiplier": 1.0
}
All parameters are externally configurable, allowing tuning without changing code.
Symbol, timeframe, and all thresholds can be updated dynamically.
9️⃣ Logging / Metrics for Forward Test
Candle timestamp, price, EMA_F, EMA_S, gap_abs, gap_norm
Slope_n, RSI, ADX
Entry/exit signals, lot number, pyramiding step
Realized P&L, unrealized P&L per candle
This ensures systematic parameter tuning and risk management.
