import { Injectable, Logger } from '@nestjs/common';
import { EMA, ATR, RSI, ADX } from 'technicalindicators';
import { StrategySignal } from './strategy-building-blocks.service';
import { CandleQueryResult } from '../../trading/services/candle-query.service';
import { TrailingStopService } from '../components/trailing-stop.service';
import { TrailingStopConfig, ActiveTrade } from '../components/trailing-stop.interface';

export interface AdvancedATRConfig {
  id: string;
  name?: string;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

  // EMA Parameters
  emaFastPeriod: number;
  emaSlowPeriod: number;

  // ATR Parameters
  atrPeriod: number;
  atrDeclineThreshold: number;        // ATR decline percentage for FIFO exits
  atrExpansionThreshold: number;      // ATR expansion percentage for pyramiding
  atrRequiredForEntry?: boolean;      // Whether ATR expansion is required for initial entries (default: false)

  // Strong Candle Filter
  strongCandleThreshold: number;

  // Gap Handling
  gapUpDownThreshold: number;

  // RSI Parameters
  rsiPeriod: number;
  rsiEntryLong: number;
  rsiEntryShort: number;
  rsiExitLong: number;
  rsiExitShort: number;

  // Slope calculation
  slopeLookback: number;

  // Capital and Risk Management
  capital: number;
  maxLossPct: number;
  positionSize: number;
  maxLots: number;

  // Pyramiding
  pyramidingEnabled: boolean;

  // Exit Mode
  exitMode: 'FIFO' | 'LIFO';
  
  // Supertrend Parameters
  supertrendPeriod?: number;
  supertrendMultiplier?: number;

  // Trailing Stop Loss
  trailingStopEnabled: boolean;
  trailingStopType: 'ATR' | 'PERCENTAGE';
  trailingStopATRMultiplier: number;      // ATR multiplier for trailing stop (e.g., 2.0 = 2x ATR)
  trailingStopPercentage: number;          // Percentage trailing stop (e.g., 0.02 = 2%)
  trailingStopActivationProfit: number;    // Minimum profit % to activate trailing stop (e.g., 0.01 = 1%)

  // Time-based Exits
  misExitTime: string;
  cncExitTime: string;

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

export interface StrategyEvaluation {
  signals: StrategySignal[];
  diagnostics: Record<string, any>;
}

@Injectable()
export class AdvancedATRStrategyService {
  private readonly logger = new Logger(AdvancedATRStrategyService.name);

  constructor(private readonly trailingStopService: TrailingStopService) {}
  
  // Track ATR values for pyramiding and FIFO logic
  private trackedATR: number = 0;
  private lastATRUpdate: Date = new Date();

  evaluate(
    config: AdvancedATRConfig,
    candles: CandleQueryResult[],
  ): StrategyEvaluation {
    if (!config || !candles || candles.length === 0) {
      return { signals: [], diagnostics: { reason: 'no_config_or_candles' } };
    }

    this.logger.debug(
      `Evaluating advanced ATR strategy with config: ${JSON.stringify(config)}`,
    );

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const opens = candles.map((c) => c.open);

    if (
      closes.length <
      Math.max(config.emaSlowPeriod, config.atrPeriod, config.rsiPeriod) + 5
    ) {
      this.logger.debug(
        `Insufficient data: ${closes.length} candles, need at least ${Math.max(config.emaSlowPeriod, config.atrPeriod, config.rsiPeriod) + 5}`,
      );
      return { signals: [], diagnostics: { reason: 'insufficient_data' } };
    }

    // Calculate indicators
    const fastSeries = EMA.calculate({
      period: config.emaFastPeriod,
      values: closes,
    });
    const slowSeries = EMA.calculate({
      period: config.emaSlowPeriod,
      values: closes,
    });
    const atrSeries = ATR.calculate({
      period: config.atrPeriod,
      high: highs,
      low: lows,
      close: closes,
    });
    const rsiSeries = RSI.calculate({
      period: config.rsiPeriod,
      values: closes,
    });
    const adxSeries = ADX.calculate({
      period: 14,
      high: highs,
      low: lows,
      close: closes,
    });

    if (
      !fastSeries.length ||
      !slowSeries.length ||
      !atrSeries.length ||
      !rsiSeries.length ||
      !adxSeries.length ||
      fastSeries.length < 2 ||
      slowSeries.length < 2
    ) {
      return {
        signals: [],
        diagnostics: { 
          reason: 'indicator_calculation_failed',
          fastLength: fastSeries.length,
          slowLength: slowSeries.length,
          atrLength: atrSeries.length,
          rsiLength: rsiSeries.length,
          adxLength: adxSeries.length
        },
      };
    }

    const fast = fastSeries[fastSeries.length - 1];
    const fastPrev = fastSeries.length >= 2 ? fastSeries[fastSeries.length - 2] : fast;
    const slow = slowSeries[slowSeries.length - 1];
    const slowPrev = slowSeries.length >= 2 ? slowSeries[slowSeries.length - 2] : slow;
    const atr = atrSeries[atrSeries.length - 1];
    const rsi = rsiSeries[rsiSeries.length - 1];
    const latestAdx = adxSeries[adxSeries.length - 1];

    const latestCandle = candles[candles.length - 1];
    const currentPrice = latestCandle.close;

    // Calculate EMA gap (your ATR logic)
    const emaGap = Math.abs(fast - slow);
    const currentATR = emaGap; // Using EMA gap as ATR measure

    // Calculate slope
    const fastSlope = (fast - fastPrev) / config.slopeLookback;
    const slowSlope = (slow - slowPrev) / config.slopeLookback;

    // Calculate candle strength
    const candleRange = latestCandle.high - latestCandle.low;
    const candleBody = Math.abs(latestCandle.close - latestCandle.open);
    const candleStrength = candleRange > 0 ? candleBody / candleRange : 0;

    // Gap detection
    const prevCandle = candles[candles.length - 2];
    const gapPercent = prevCandle ? 
      Math.abs(latestCandle.open - prevCandle.close) / prevCandle.close : 0;
    const isGapUp = latestCandle.open > prevCandle.close;
    const isGapDown = latestCandle.open < prevCandle.close;

    // Market open candle detection
    const candleTime = new Date(latestCandle.timestamp);
    const isMarketOpenCandle = candleTime.getUTCHours() === 3 && candleTime.getUTCMinutes() === 45;

    // Supertrend calculation (ATR-based trend following)
    const supertrendPeriod = config.supertrendPeriod || 10;
    const supertrendMultiplier = config.supertrendMultiplier || 2.0; // Use 2.0 as default for Supertrend(10, 2)
    const supertrend = currentATR * supertrendMultiplier;
    
    // Calculate Supertrend bands
    const hl2 = (latestCandle.high + latestCandle.low) / 2;
    const upperBand = hl2 + supertrend;
    const lowerBand = hl2 - supertrend;
    
    // Simplified Supertrend implementation
    // Use price position relative to bands to determine trend
    // If price is above the middle (hl2), it's bullish
    // If price is below the middle (hl2), it's bearish
    const isBullishTrend = latestCandle.close > hl2;
    const isBearishTrend = latestCandle.close < hl2;
    
    // Previous candle for trend change detection
    const prevHl2 = prevCandle ? (prevCandle.high + prevCandle.low) / 2 : hl2;
    const prevIsBullishTrend = prevCandle ? prevCandle.close > prevHl2 : false;
    const prevIsBearishTrend = prevCandle ? prevCandle.close < prevHl2 : false;
    
    // Supertrend crossover detection
    const crossedUp = !prevIsBullishTrend && isBullishTrend;
    const crossedDown = !prevIsBearishTrend && isBearishTrend;
    
    // Debug logging for Supertrend
    this.logger.debug(`Supertrend Debug: Close=${latestCandle.close.toFixed(2)}, HL2=${hl2.toFixed(2)}, Upper=${upperBand.toFixed(2)}, Lower=${lowerBand.toFixed(2)}, Bullish=${isBullishTrend}, Bearish=${isBearishTrend}, CrossedUp=${crossedUp}, CrossedDown=${crossedDown}`);

    // RSI conditions - only apply if RSI thresholds are set (not 0)
    const rsiEntryLong = config.rsiEntryLong > 0 ? rsi > config.rsiEntryLong : true;
    const rsiEntryShort = config.rsiEntryShort > 0 ? rsi < config.rsiEntryShort : true;
    const rsiExitLong = config.rsiExitLong > 0 ? rsi < config.rsiExitLong : false;
    const rsiExitShort = config.rsiExitShort > 0 ? rsi > config.rsiExitShort : false;

    // Advanced ATR Logic Implementation
    const signals: StrategySignal[] = [];
    
    // Priority: Exit signals take precedence over entry signals to prevent simultaneous signals
    let hasExitSignal = false;

    // Initialize tracked ATR if not set
    if (this.trackedATR === 0) {
      this.trackedATR = currentATR;
      this.lastATRUpdate = new Date(latestCandle.timestamp);
    }

    // ATR Expansion Check (Pyramiding)
    const atrExpansionThreshold = config.atrExpansionThreshold; // e.g., 0.1 for 10%
    const atrExpanding = currentATR > this.trackedATR * (1 + atrExpansionThreshold);
    
    // ATR Decline Check (FIFO Exit)
    const atrDeclineThreshold = config.atrDeclineThreshold; // e.g., 0.1 for 10%
    const atrDeclining = currentATR < this.trackedATR * (1 - atrDeclineThreshold);

    // Update tracked ATR if significant change
    if (atrExpanding || atrDeclining) {
      this.trackedATR = currentATR;
      this.lastATRUpdate = new Date(latestCandle.timestamp);
    }

    // Entry Logic - ATR requirement is now configurable
    const atrRequiredForEntry = config.atrRequiredForEntry ?? false; // Default to false for backward compatibility
    
    // Initial Entry Logic using Supertrend - Only if no exit signal
    if (!hasExitSignal && crossedUp && rsiEntryLong && (!atrRequiredForEntry || atrExpanding)) {
      signals.push(this.buildEntrySignal('LONG', config, latestCandle, {
        supertrend: supertrend,
        upperBand: upperBand,
        lowerBand: lowerBand,
        atr: currentATR,
        rsi,
        atrExpanding: atrRequiredForEntry ? atrExpanding : true, // Always true if ATR not required
        trackedATR: this.trackedATR,
        atrExpansionThreshold,
        atrRequiredForEntry
      }));
    }

    if (!hasExitSignal && crossedDown && rsiEntryShort && (!atrRequiredForEntry || atrExpanding)) {
      signals.push(this.buildEntrySignal('SHORT', config, latestCandle, {
        supertrend: supertrend,
        upperBand: upperBand,
        lowerBand: lowerBand,
        atr: currentATR,
        rsi,
        atrExpanding: atrRequiredForEntry ? atrExpanding : true, // Always true if ATR not required
        trackedATR: this.trackedATR,
        atrExpansionThreshold,
        atrRequiredForEntry
      }));
    }

    // Pyramiding Logic (Add positions on ATR expansion) - Only if no exit signal
    // Disabled for cleaner Supertrend + RSI strategy
    if (!hasExitSignal && atrExpanding && config.pyramidingEnabled && false) { // Disabled pyramiding
      if (isBullishTrend && rsiEntryLong) {
        signals.push(this.buildPyramidingSignal('LONG', config, latestCandle, {
          supertrend: supertrend,
          upperBand: upperBand,
          lowerBand: lowerBand,
          atr: currentATR,
          rsi,
          atrExpanding,
          trackedATR: this.trackedATR,
          atrExpansionThreshold
        }));
      }

      if (isBearishTrend && rsiEntryShort) {
        signals.push(this.buildPyramidingSignal('SHORT', config, latestCandle, {
          supertrend: supertrend,
          upperBand: upperBand,
          lowerBand: lowerBand,
          atr: currentATR,
          rsi,
          atrExpanding,
          trackedATR: this.trackedATR,
          atrExpansionThreshold
        }));
      }
    }

    // FIFO Exit Logic (Remove positions on ATR decline)
    if (atrDeclining) {
      if (isBullishTrend) {
        signals.push(this.buildFIFOExitSignal('LONG', config, latestCandle, {
          supertrend: supertrend,
          upperBand: upperBand,
          lowerBand: lowerBand,
          atr: currentATR,
          rsi,
          atrDeclining,
          trackedATR: this.trackedATR,
          atrDeclineThreshold
        }));
        hasExitSignal = true;
      }
      
      if (isBearishTrend) {
        signals.push(this.buildFIFOExitSignal('SHORT', config, latestCandle, {
          supertrend: supertrend,
          upperBand: upperBand,
          lowerBand: lowerBand,
          atr: currentATR,
          rsi,
          atrDeclining,
          trackedATR: this.trackedATR,
          atrDeclineThreshold
        }));
        hasExitSignal = true;
      }
    }

    // Emergency Exit Conditions
    if (rsiExitLong && isBullishTrend) {
      signals.push(this.buildEmergencyExitSignal('LONG', config, latestCandle, {
        reason: 'RSI_EXIT',
        rsi,
        rsiExitLong
      }));
      hasExitSignal = true;
    }

    if (rsiExitShort && isBearishTrend) {
      signals.push(this.buildEmergencyExitSignal('SHORT', config, latestCandle, {
        reason: 'RSI_EXIT',
        rsi,
        rsiExitShort
      }));
      hasExitSignal = true;
    }

    // Note: Trailing stop logic is now handled by the TrailingStopService component
    // This will be integrated at the backtest orchestrator level for better separation of concerns

    if (crossedDown && isBullishTrend) {
      signals.push(this.buildEmergencyExitSignal('LONG', config, latestCandle, {
        reason: 'EMA_FLIP',
        fast,
        slow,
        crossedDown
      }));
    }

    if (crossedUp && isBearishTrend) {
      signals.push(this.buildEmergencyExitSignal('SHORT', config, latestCandle, {
        reason: 'EMA_FLIP',
        fast,
        slow,
        crossedUp
      }));
    }

    // Diagnostics
    const diagnostics = {
      fast,
      slow,
      fastPrev,
      slowPrev,
      fastSlope,
      slowSlope,
      gapAbs: emaGap,
      gapNorm: atr > 0 ? emaGap / atr : 0,
      atr: currentATR,
      trackedATR: this.trackedATR,
      atrExpanding,
      atrDeclining,
      atrExpansionThreshold,
      atrDeclineThreshold,
      rsi,
      adx: latestAdx,
      latestClose: currentPrice,
      candleStrength,
      gapPercent,
      isMarketOpenCandle,
      isGapUp,
      isGapDown,
      crossedUp,
      crossedDown,
      isBullishTrend,
      isBearishTrend,
      rsiEntryLong,
      rsiEntryShort,
      rsiExitLong,
      rsiExitShort,
      lastATRUpdate: this.lastATRUpdate
    };

    this.logger.debug(`Advanced ATR Diagnostics ${new Date(latestCandle.timestamp).toISOString()}:`, diagnostics);

    return { signals, diagnostics };
  }

  private buildEntrySignal(
    direction: 'LONG' | 'SHORT',
    config: AdvancedATRConfig,
    candle: CandleQueryResult,
    diagnostics: any
  ): StrategySignal {
    return {
      type: 'ENTRY',
      strength: Math.min(100, Math.abs(diagnostics.fast - diagnostics.slow) * 10),
      confidence: diagnostics.rsi,
      timestamp: new Date(candle.timestamp),
      data: {
        direction,
        price: candle.close,
        symbol: config.symbol,
        timeframe: config.timeframe,
        diagnostics: {
          ...diagnostics,
          signalType: 'ENTRY',
          atrExpanding: true
        }
      }
    };
  }

  private buildPyramidingSignal(
    direction: 'LONG' | 'SHORT',
    config: AdvancedATRConfig,
    candle: CandleQueryResult,
    diagnostics: any
  ): StrategySignal {
    return {
      type: 'ENTRY',
      strength: Math.min(100, Math.abs(diagnostics.fast - diagnostics.slow) * 10),
      confidence: diagnostics.rsi,
      timestamp: new Date(candle.timestamp),
      data: {
        direction,
        price: candle.close,
        symbol: config.symbol,
        timeframe: config.timeframe,
        diagnostics: {
          ...diagnostics,
          signalType: 'PYRAMIDING',
          atrExpanding: true
        }
      }
    };
  }

  private buildFIFOExitSignal(
    direction: 'LONG' | 'SHORT',
    config: AdvancedATRConfig,
    candle: CandleQueryResult,
    diagnostics: any
  ): StrategySignal {
    return {
      type: 'EXIT',
      strength: Math.min(100, Math.abs(diagnostics.fast - diagnostics.slow) * 10),
      confidence: diagnostics.rsi,
      timestamp: new Date(candle.timestamp),
      data: {
        direction,
        price: candle.close,
        symbol: config.symbol,
        timeframe: config.timeframe,
        diagnostics: {
          ...diagnostics,
          signalType: 'FIFO_EXIT',
          atrDeclining: true
        }
      }
    };
  }

  private buildEmergencyExitSignal(
    direction: 'LONG' | 'SHORT',
    config: AdvancedATRConfig,
    candle: CandleQueryResult,
    diagnostics: any
  ): StrategySignal {
    return {
      type: 'EXIT',
      strength: 100,
      confidence: 100,
      timestamp: new Date(candle.timestamp),
      data: {
        direction,
        price: candle.close,
        symbol: config.symbol,
        timeframe: config.timeframe,
        diagnostics: {
          ...diagnostics,
          signalType: 'EMERGENCY_EXIT'
        }
      }
    };
  }

  private buildTrailingStopSignal(
    direction: 'LONG' | 'SHORT',
    config: AdvancedATRConfig,
    candle: CandleQueryResult,
    diagnostics: any
  ): StrategySignal {
    return {
      type: 'EXIT',
      strength: 90,
      confidence: 85,
      timestamp: new Date(candle.timestamp),
      data: {
        direction,
        price: candle.close,
        symbol: config.symbol,
        timeframe: config.timeframe,
        diagnostics: {
          ...diagnostics,
          signalType: 'TRAILING_STOP'
        }
      }
    };
  }
}
