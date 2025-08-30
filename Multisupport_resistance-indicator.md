🛠️ Dev Instructions for Multi-Rejection SR Zone Indicator
📌 Objective
Create an indicator that automatically identifies support & resistance zones on a given timeframe (e.g., 1H), based on multiple rejections (≥2) at or near the same price area.
These zones will then be used in combination with HTF Supertrend bias for entries/exits.
📌 Core Logic
Zone Definition
A zone = price band, not a single line.
Zone width = configurable (default: ±0.25% of price or ±1 × ATR(period=14)).
Swing Detection
Detect swing highs and lows (fractals):
Swing high = local high greater than N bars before & after (default N=2).
Swing low = local low less than N bars before & after (default N=2).
Zone Validation (Multi-Rejection Rule)
When a new swing high/low is detected, check if it lies within an existing zone.
If yes → increment test count.
If no → create a new zone.
Mark zones as “validated” only if test count ≥ 2.
Zone Strength (Optional)
Stronger zones = more rejections.
Represent visually with color intensity or thickness.
Zone Expiry / Cleanup
If price breaks through a zone by more than zone width × 1.5, mark it as broken.
Keep only last X zones (default: 10).
📌 Inputs (Configurable in Indicator)
ATR length (default 14).
Zone width multiplier (default 1 × ATR).
Min rejections to validate (default 2).
Max lookback bars (default 500).
Show broken zones (true/false).
Highlight strongest zone only (true/false).
📌 Outputs
Plot horizontal zones (bands) for validated SR.
Zones should be visually distinct (e.g., shaded rectangles).
Color intensity = strength (# of rejections).
Optionally show rejected candle markers.