import { Injectable, Logger } from '@nestjs/common';
import { EMA, ATR, RSI, ADX } from 'technicalindicators';
import { StrategySignal } from './strategy-building-blocks.service';
import { CandleQueryResult } from '../../trading/services/candle-query.service';

export interface EmaGapAtrConfig {
  id: string;
  name?: string;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

  // EMA Parameters
  emaFastPeriod: number;
  emaSlowPeriod: number;

  // ATR Parameters
  atrPeriod: number;
  atrMultiplierEntry: number;
  atrMultiplierUnwind: number;
  
  // Advanced ATR Parameters (optional)
  atrDeclineThreshold?: number;
  atrExpansionThreshold?: number;

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

  // Trailing Stop Loss
  trailingStopEnabled?: boolean;
  trailingStopType?: 'ATR' | 'PERCENTAGE';
  trailingStopATRMultiplier?: number;      // ATR multiplier for trailing stop (e.g., 2.0 = 2x ATR)
  trailingStopPercentage?: number;          // Percentage trailing stop (e.g., 0.02 = 2%)
  trailingStopActivationProfit?: number;    // Minimum profit % to activate trailing stop (e.g., 0.01 = 1%)
  maxTrailDistance?: number;                // Maximum trailing distance (e.g., 0.05 = 5%)

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
export class EmaGapAtrStrategyService {
  private readonly logger = new Logger(EmaGapAtrStrategyService.name);

  evaluate(
    config: EmaGapAtrConfig,
    candles: CandleQueryResult[],
  ): StrategyEvaluation {
    if (!config || !candles || candles.length === 0) {
      return { signals: [], diagnostics: { reason: 'no_config_or_candles' } };
    }

    this.logger.debug(
      `Evaluating strategy with config: ${JSON.stringify(config)}`,
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
    // ADX is optional in v2, use a default period or skip if not needed
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
      !adxSeries.length
    ) {
      return {
        signals: [],
        diagnostics: { reason: 'indicator_calculation_failed' },
      };
    }

    const fast = fastSeries[fastSeries.length - 1];
    const fastPrev = fastSeries[fastSeries.length - 2] ?? fast;

    const slow = slowSeries[slowSeries.length - 1];
    const slowPrev = slowSeries[slowSeries.length - 2] ?? slow;

    const atr = atrSeries[atrSeries.length - 1];
    const rsi = rsiSeries[rsiSeries.length - 1];
    const latestAdx = adxSeries[adxSeries.length - 1];
    const adx = latestAdx?.adx ?? 0;

    const latestCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];

    // Calculate candle strength (body size relative to total range)
    const candleRange = latestCandle.high - latestCandle.low;
    const candleBody = Math.abs(latestCandle.close - latestCandle.open);
    const candleStrength = candleRange > 0 ? candleBody / candleRange : 0;

    // Check for gap handling (9:15 AM candle)
    const isMarketOpenCandle = this.isMarketOpenCandle(latestCandle.timestamp);
    const gapPercent = prevCandle
      ? Math.abs(latestCandle.open - prevCandle.close) / prevCandle.close
      : 0;
    const isGapUp = latestCandle.open > prevCandle?.close;
    const isGapDown = latestCandle.open < prevCandle?.close;

    const fastSlope = this.computeSlope(fastSeries, 3); // Use 3 for slope lookback
    const gapAbs = Math.abs(fast - slow);
    const gapNorm = atr > 0 ? gapAbs / atr : 0;

    // Trend detection
    const crossedUp = fastPrev <= slowPrev && fast > slow;
    const crossedDown = fastPrev >= slowPrev && fast < slow;
    const isBullishTrend = fast > slow && fastSlope > 0;
    const isBearishTrend = fast < slow && fastSlope < 0;

    // Gap entry conditions
    const gapEntryLong =
      isMarketOpenCandle &&
      isGapUp &&
      gapPercent >= config.gapUpDownThreshold &&
      candleStrength >= config.strongCandleThreshold;
    const gapEntryShort =
      isMarketOpenCandle &&
      isGapDown &&
      gapPercent >= config.gapUpDownThreshold &&
      candleStrength >= config.strongCandleThreshold;

    // Standard entry conditions
    const standardEntryLong =
      crossedUp &&
      gapNorm >= config.atrMultiplierEntry;
    const standardEntryShort =
      crossedDown &&
      gapNorm >= config.atrMultiplierEntry;

    // RSI conditions
    const rsiEntryLong = rsi >= config.rsiEntryLong;
    const rsiEntryShort = rsi <= config.rsiEntryShort;
    const rsiExitLong = rsi <= config.rsiExitLong;
    const rsiExitShort = rsi >= config.rsiExitShort;

    // Exit conditions
    const emaFlipExitLong = crossedDown && isBearishTrend;
    const emaFlipExitShort = crossedUp && isBullishTrend;
    const atrContractionExit = gapNorm <= config.atrMultiplierUnwind;

    const diagnostics = {
      fast,
      slow,
      fastPrev,
      slowPrev,
      fastSlope,
      gapAbs,
      gapNorm,
      atr,
      rsi,
      adx,
      latestClose: latestCandle.close,
      candleStrength,
      gapPercent,
      isMarketOpenCandle,
      isGapUp,
      isGapDown,
      crossedUp,
      crossedDown,
      isBullishTrend,
      isBearishTrend,
      gapEntryLong,
      gapEntryShort,
      standardEntryLong,
      standardEntryShort,
      rsiEntryLong,
      rsiEntryShort,
    };

    this.logger.debug(
      `Diagnostics ${new Date(latestCandle.timestamp).toISOString()}: ${JSON.stringify({
        fast,
        slow,
        fastPrev,
        slowPrev,
        fastSlope,
        gapAbs,
        gapNorm,
        atr,
        rsi,
        adx,
        candleStrength,
        gapPercent,
        isMarketOpenCandle,
        isGapUp,
        isGapDown,
        crossedUp,
        crossedDown,
        isBullishTrend,
        isBearishTrend,
        gapEntryLong,
        gapEntryShort,
        standardEntryLong,
        standardEntryShort,
        rsiEntryLong,
        rsiEntryShort,
        emaFlipExitLong,
        emaFlipExitShort,
        atrContractionExit,
      })}`,
    );

    const signals: StrategySignal[] = [];

    // Log entry conditions for debugging
    this.logger.debug(`🔍 ENTRY CONDITIONS CHECK ${new Date(latestCandle.timestamp).toISOString()}:`);
    this.logger.debug(`  📊 EMA Crossover: crossedUp=${crossedUp}, crossedDown=${crossedDown}`);
    this.logger.debug(`  📈 Gap Entry: gapEntryLong=${gapEntryLong}, gapEntryShort=${gapEntryShort}`);
    this.logger.debug(`  📉 Standard Entry: standardEntryLong=${standardEntryLong}, standardEntryShort=${standardEntryShort}`);
    this.logger.debug(`  🎯 RSI Entry: rsiEntryLong=${rsiEntryLong}, rsiEntryShort=${rsiEntryShort}`);
    this.logger.debug(`  💪 Strong Candle: candleStrength=${candleStrength.toFixed(4)} >= ${config.strongCandleThreshold} = ${candleStrength >= config.strongCandleThreshold}`);
    this.logger.debug(`  📏 Gap Norm: gapNorm=${gapNorm.toFixed(4)} >= ${config.atrMultiplierEntry} = ${gapNorm >= config.atrMultiplierEntry}`);
    this.logger.debug(`  🕘 Market Open: isMarketOpenCandle=${isMarketOpenCandle}`);
    this.logger.debug(`  📊 Gap Detection: isGapUp=${isGapUp}, isGapDown=${isGapDown}, gapPercent=${gapPercent.toFixed(6)}`);

    // Entry signals
    // For gap entries (9:15 AM), apply strong candle filter
    // For standard entries (after crossover), no strong candle filter needed
    if (gapEntryLong && rsiEntryLong) {
      this.logger.debug(`✅ GAP LONG ENTRY: gapEntryLong=${gapEntryLong} && rsiEntryLong=${rsiEntryLong}`);
      signals.push(
        this.buildEntrySignal('LONG', config, latestCandle, diagnostics),
      );
    } else {
      this.logger.debug(`❌ GAP LONG ENTRY BLOCKED: gapEntryLong=${gapEntryLong}, rsiEntryLong=${rsiEntryLong}`);
    }
    
    if (gapEntryShort && rsiEntryShort) {
      this.logger.debug(`✅ GAP SHORT ENTRY: gapEntryShort=${gapEntryShort} && rsiEntryShort=${rsiEntryShort}`);
      signals.push(
        this.buildEntrySignal('SHORT', config, latestCandle, diagnostics),
      );
    } else {
      this.logger.debug(`❌ GAP SHORT ENTRY BLOCKED: gapEntryShort=${gapEntryShort}, rsiEntryShort=${rsiEntryShort}`);
    }
    
    // Standard entries (after crossover) - no strong candle filter
    if (standardEntryLong && rsiEntryLong) {
      this.logger.debug(`✅ STANDARD LONG ENTRY: standardEntryLong=${standardEntryLong} && rsiEntryLong=${rsiEntryLong}`);
      signals.push(
        this.buildEntrySignal('LONG', config, latestCandle, diagnostics),
      );
    } else {
      this.logger.debug(`❌ STANDARD LONG ENTRY BLOCKED: standardEntryLong=${standardEntryLong}, rsiEntryLong=${rsiEntryLong}`);
    }
    
    if (standardEntryShort && rsiEntryShort) {
      this.logger.debug(`✅ STANDARD SHORT ENTRY: standardEntryShort=${standardEntryShort} && rsiEntryShort=${rsiEntryShort}`);
      signals.push(
        this.buildEntrySignal('SHORT', config, latestCandle, diagnostics),
      );
    } else {
      this.logger.debug(`❌ STANDARD SHORT ENTRY BLOCKED: standardEntryShort=${standardEntryShort}, rsiEntryShort=${rsiEntryShort}`);
    }

    // Exit signals
    if (emaFlipExitLong || rsiExitLong || atrContractionExit) {
      signals.push(
        this.buildExitSignal('LONG', config, latestCandle, diagnostics),
      );
    }
    if (emaFlipExitShort || rsiExitShort || atrContractionExit) {
      signals.push(
        this.buildExitSignal('SHORT', config, latestCandle, diagnostics),
      );
    }

    this.logger.debug(
      `Signals generated ${new Date(latestCandle.timestamp).toISOString()}: ${JSON.stringify(
        signals.map((signal) => ({
          type: signal.type,
          direction: signal.data?.direction,
          strength: signal.strength,
          confidence: signal.confidence,
        })),
      )}`,
    );

    return { signals, diagnostics };
  }

  private isMarketOpenCandle(timestamp: number): boolean {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours === 9 && minutes === 15;
  }

  private computeSlope(series: number[], lookback: number): number {
    if (!series.length) return 0;
    const lb = Math.max(1, lookback);
    const latest = series[series.length - 1];
    const pastIndex = Math.max(0, series.length - 1 - lb);
    const past = series[pastIndex];
    return (latest - past) / lb;
  }

  private buildEntrySignal(
    direction: 'LONG' | 'SHORT',
    config: EmaGapAtrConfig,
    candle: CandleQueryResult,
    diagnostics: Record<string, any>,
  ): StrategySignal {
    const baseStrength = Math.min(
      100,
      Math.abs(diagnostics.gapNorm || 0) * 20 + (diagnostics.adx || 0),
    );
    const confidence = Math.min(100, diagnostics.rsi || 0);

    const signalData: any = {
      direction,
      price: candle.close,
      symbol: config.symbol,
      timeframe: config.timeframe,
      diagnostics,
    };

    // Add option strike selection if enabled
    if (config.options?.enabled && config.options.strikeSelection) {
      signalData.options = {
        strikeSelection: config.options.strikeSelection,
        lotSize: config.options.lotSize || 50,
        strikeIncrement: config.options.strikeIncrement || 50,
      };
    }

    return {
      type: 'ENTRY',
      strength: baseStrength,
      confidence,
      timestamp: new Date(candle.timestamp),
      data: signalData,
    };
  }

  private buildExitSignal(
    direction: 'LONG' | 'SHORT',
    config: EmaGapAtrConfig,
    candle: CandleQueryResult,
    diagnostics: Record<string, any>,
  ): StrategySignal {
    const baseStrength = Math.min(
      100,
      Math.abs(diagnostics.gapNorm || 0) * 20 + (diagnostics.adx || 0),
    );
    const confidence = Math.min(100, diagnostics.rsi || 0);

    const signalData: any = {
      direction,
      price: candle.close,
      symbol: config.symbol,
      timeframe: config.timeframe,
      diagnostics,
    };

    return {
      type: 'EXIT',
      strength: baseStrength,
      confidence,
      timestamp: new Date(candle.timestamp),
      data: signalData,
    };
  }
}
