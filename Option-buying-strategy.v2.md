📘 EMA + ATR Trend Pyramiding Strategy – v2.2 (Detailed Explanation)
🎯 Overview
This strategy is designed to capture trends while managing risk dynamically. It’s based on the observation that markets are either trending or sideways:
EMA crossovers signal trend changes.
ATR expansion measures trend strength.
Strong candles indicate reliable momentum.
RSI confirms the trend and helps avoid false signals.
Pyramiding increases position in strong trends, while FIFO scaling out locks profits when momentum weakens.
Gap handling captures strong moves at market open.
Time and capital-based exits prevent overnight risk and protect trading capital.
⚙️ Configurable Parameters (config.json)
All parameters are config-driven to allow easy tuning without changing code:
{
  "symbol": "NIFTY",
  "timeframe": "15m",
  "backtest_start_date": "2015-01-01",
  "backtest_end_date": "2025-09-27",

  "ema_fast": 9,                      // Short-term trend sensitivity
  "ema_slow": 21,                     // Longer-term trend filter
  "atr_period": 14,                    // ATR lookback for volatility
  "atr_multiplier_entry": 1.5,         // Min ATR multiple to trigger entry
  "atr_multiplier_unwind": 0.75,       // ATR multiple to trigger position reduction

  "strong_candle_threshold": 0.6,      // Candle body > 60% of full candle
  "gap_up_down_threshold": 0.5,        // % gap for 9:15 candle trigger

  "rsi_period": 14,
  "rsi_entry_long": 50,
  "rsi_entry_short": 50,
  "rsi_exit_long": 50,
  "rsi_exit_short": 50,

  "capital": 100000,
  "max_loss_pct": 0.01,               // Capital stop-loss
  "position_size": 1,                 // Base lot per entry
  "max_lots": 5,                      // Max pyramiding layers
  "pyramiding_enabled": true,
  "exit_mode": "FIFO",                // FIFO exits to lock profits

  "mis_exit_time": "15:15",
  "cnc_exit_time": "15:15"
}
📈 Entry Rules (Detailed)
1. Gap Handling (Market Open, 9:15 AM Candle)
Market often opens with a gap up or gap down due to overnight news or sentiment.
Rule: If the gap is > gap_up_down_threshold and the 9:15 15-min candle has a body > strong_candle_threshold in the direction of EMA crossover:
Enter trade immediately.
This ensures you capture strong opening trends without waiting for normal EMA + RSI + ATR signals.
Explanation: Strong gap + strong candle is a high-probability momentum signal; skipping it may miss a big early trend.
2. Standard EMA + ATR + RSI Entry
EMA Cross: EMA Fast > EMA Slow → bullish; EMA Fast < EMA Slow → bearish.
ATR Gap: Gap = |EMA_fast - EMA_slow| ≥ atr_multiplier_entry × ATR
Ensures trend is strong enough to justify entering the market.
Strong Candle Filter: 15-min candle body > strong_candle_threshold
RSI Filter:
Long: RSI > rsi_entry_long
Short: RSI < rsi_entry_short
Explanation: Combining EMA crossover + ATR + RSI + candle body ensures entries only on meaningful, high-probability trends, reducing whipsaws in sideways markets.
3. Pyramiding Logic
Why: Trends often continue after the initial signal. Pyramiding lets you add to winning positions.
How:
Each time EMA gap widens beyond the next ATR multiple band, add another lot.
Max lots = max_lots.
Example:
ATR = 10 points
Entry at Gap = 15 points → 1st lot
Gap widens to 20 points → 2nd lot
Gap widens to 25 points → 3rd lot
Explanation: You scale exposure according to trend strength, avoiding overexposure in weak trends.
📉 Exit Rules (Detailed)
1. Dynamic Scaling Out (FIFO)
Rule: When EMA gap contracts below atr_multiplier_unwind × ATR, exit oldest position first.
Explanation:
Locks in profits on early entries.
Maintains exposure in remaining positions riding momentum.
FIFO vs LIFO: FIFO better preserves equity because profits from older trades are realized first.
2. RSI Exit
Long: RSI < rsi_exit_long → exit all long positions
Short: RSI > rsi_exit_short → exit all short positions
Explanation: RSI indicates trend weakening or reversal. Exit avoids riding a dying trend.
3. EMA Flip Exit
Rule: Opposite EMA crossover → exit all positions
Explanation: Fundamental trend change detected; trend-following stops here.
4. Capital Protection
Rule: If total P&L < max_loss_pct × capital → exit all positions
Explanation: Limits catastrophic drawdowns; ensures capital survives for next trades.
5. Time-Based Exit
MIS Orders: Exit at mis_exit_time (default 15:15)
CNC / Positional: Exit at expiry day cnc_exit_time (default 15:15)
Explanation: Controls intraday risk and aligns with brokerage/settlement rules.

Flow chart 

[9:15 Candle Gap Check] --Strong?--> [Enter Initial Lot]
      |
      No
      v
[EMA Fast / Slow Crossover + RSI Filter + ATR Gap] --> [Enter Initial Lot]

      |
      v
[ATR Gap Expands?] --Yes--> [Add Lot (Max = max_lots)]
      |
      No
      v
[ATR Gap Contracts?] --Yes--> [Scale Out Oldest Lot (FIFO)]
      |
      v
[RSI Weakens or EMA Flips or Capital Stop Hit?] --> [Exit Remaining Positions]

      |
      v
[Time-Based Exit?] --> [Exit all positions (MIS / CNC)]


diffrence between current and propsed 

| Feature           | v1                | v2                                                           |
| ----------------- | ----------------- | ------------------------------------------------------------ |
| Initial Entry     | EMA + RSI/ADX     | EMA + RSI + ATR + Strong candle + Gap                        |
| Pyramiding        | Optional / simple | Dynamic, ATR-based, max\_lots                                |
| Scaling Out       | None              | FIFO based on ATR contraction                                |
| Gap Open Handling | No                | Yes, strong 9:15 candle                                      |
| Exit Conditions   | EMA flip or RSI   | EMA flip / RSI / ATR contraction / Capital stop / Time-based |
| Risk Control      | Minimal           | Fully configurable, capital stop, time-based exit            |

