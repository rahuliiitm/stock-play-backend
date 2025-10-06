import { Injectable, Logger } from '@nestjs/common';
import { ATR } from 'technicalindicators';
import { StrategySignal } from './strategy-building-blocks.service';
import { CandleQueryResult } from '../../trading/services/candle-query.service';
import { StrategyIndicatorsService } from '../indicators/strategy-indicators.service';

export interface TrendFollowingConfig {
  id: string;
  name?: string;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  
  // DEMA Parameters
  demaPeriod: number; // Default: 52 for weekly
  
  // Supertrend Parameters
  supertrendPeriod: number; // Default: 10
  supertrendMultiplier: number; // Default: 1
  
  // ATR Parameters (for Supertrend calculation)
  atrPeriod: number; // Default: 10
  
  // Risk Management
  maxLossPct: number;
  positionSize: number;
  maxLots: number;
  
  // Exit Mode
  exitMode: 'FIFO' | 'LIFO';
  
  // Trailing Stop Loss
  trailingStopEnabled: boolean;
  trailingStopType: 'ATR' | 'PERCENTAGE';
  trailingStopATRMultiplier: number;
  trailingStopPercentage: number;
  trailingStopActivationProfit: number;
  maxTrailDistance: number;
  
  // Optimization Parameters
  profitTargetEnabled?: boolean;
  profitTargetPercentage?: number;
  volatilityFilterEnabled?: boolean;
  maxVolatility?: number;
  maxHoldDays?: number;
}

export interface StrategyEvaluation {
  signals: StrategySignal[];
  diagnostics: Record<string, any>;
}

@Injectable()
export class TrendFollowingStrategyService {
  private readonly logger = new Logger(TrendFollowingStrategyService.name);

  constructor(
    private readonly indicatorsService: StrategyIndicatorsService,
  ) {}

  evaluate(
    config: TrendFollowingConfig,
    candles: CandleQueryResult[],
  ): StrategyEvaluation {
    if (!config || !candles || candles.length === 0) {
      return { signals: [], diagnostics: { reason: 'no_config_or_candles' } };
    }

    this.logger.debug(
      `Evaluating trend-following strategy with config: ${JSON.stringify(config)}`,
    );

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const opens = candles.map((c) => c.open);

    // Need sufficient data for DEMA and Supertrend calculations
    // DEMA needs demaPeriod + some buffer, not demaPeriod * 2
    const minRequired = Math.max(config.demaPeriod + 10, config.supertrendPeriod + config.atrPeriod);
    if (closes.length < minRequired) {
      this.logger.debug(
        `Insufficient data: ${closes.length} candles, need at least ${minRequired}`,
      );
      return { signals: [], diagnostics: { reason: 'insufficient_data' } };
    }

    // Calculate DEMA using centralized indicators service
    this.logger.debug(`DEMA calculation - closes length: ${closes.length}, demaPeriod: ${config.demaPeriod}`);
    
    // Convert CandleQueryResult to CandleData format for the indicators service
    const candleData = candles.map(candle => ({
      symbol: config.symbol,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume || 0,
      timeframe: config.timeframe
    }));
    
    const demaResult = this.indicatorsService.calculateDEMA(candleData, config.demaPeriod);
    if (!demaResult) {
      return { signals: [], diagnostics: { reason: 'dema_calculation_failed' } };
    }
    
    // For now, we'll use the latest DEMA value and create a simple series
    // In a real implementation, you might want to get the full series from the provider
    const demaSeries = [demaResult.dema];
    this.logger.debug(`DEMA calculation result - value: ${demaResult.dema.toFixed(2)}`);

    // Calculate ATR for Supertrend
    const atrSeries = ATR.calculate({
      period: config.atrPeriod,
      high: highs,
      low: lows,
      close: closes,
    });

    if (atrSeries.length === 0) {
      return { signals: [], diagnostics: { reason: 'atr_calculation_failed' } };
    }

    // Calculate Supertrend
    const supertrend = this.calculateSupertrend(
      highs,
      lows,
      closes,
      atrSeries,
      config.supertrendPeriod,
      config.supertrendMultiplier,
    );

    if (supertrend.length === 0) {
      return { signals: [], diagnostics: { reason: 'supertrend_calculation_failed' } };
    }

    // Get latest values
    const latestClose = closes[closes.length - 1];
    const latestDEMA = demaSeries[demaSeries.length - 1];
    const latestSupertrend = supertrend[supertrend.length - 1];
    const previousSupertrend = supertrend.length > 1 ? supertrend[supertrend.length - 2] : latestSupertrend;
    
    // Debug logging for DEMA calculation
    this.logger.debug(`DEMA Debug - Close: ${latestClose}, DEMA: ${latestDEMA}, DEMA length: ${demaSeries.length}`);
    this.logger.debug(`DEMA series last 5 values: ${demaSeries.slice(-5).map(v => v.toFixed(2)).join(', ')}`);

    // Determine current trend direction
    const isBullishTrend = latestClose > latestSupertrend;
    const isBearishTrend = latestClose < latestSupertrend;
    
    // Check for Supertrend flip by comparing current and previous trend directions
    const supertrendFlipped = this.checkSupertrendFlip(supertrend, closes);

    // Entry conditions
    const previousClose = closes.length > 1 ? closes[closes.length - 2] : latestClose;
    const previousDEMA = demaSeries.length > 1 ? demaSeries[demaSeries.length - 2] : latestDEMA;

    // Calculate momentum indicators (only if explicitly enabled)
    const rsiEnabled = (config as any).rsiEnabled === true;
    const macdEnabled = (config as any).macdEnabled === true;
    const supportResistanceEnabled = (config as any).supportResistanceEnabled === true;
    
    let rsi: number[] = [];
    let macd: { macd: number[]; signal: number[]; histogram: number[] } = { macd: [], signal: [], histogram: [] };
    let supportResistance: { support: number | null; resistance: number | null } = { support: null, resistance: null };
    
    if (rsiEnabled) {
      const rsiPeriod = (config as any).rsiPeriod || 14;
      rsi = this.calculateRSI(closes, rsiPeriod);
    }
    
    if (macdEnabled) {
      const macdFast = (config as any).macdFast || 12;
      const macdSlow = (config as any).macdSlow || 26;
      const macdSignal = (config as any).macdSignal || 9;
      macd = this.calculateMACD(closes, macdFast, macdSlow, macdSignal);
    }
    
    if (supportResistanceEnabled) {
      const srLookbackPeriod = (config as any).srLookbackPeriod || 20;
      const srMinTouchCount = (config as any).srMinTouchCount || 2;
      const srLevelTolerance = (config as any).srLevelTolerance || 0.005;
      supportResistance = this.calculateSupportResistance(highs, lows, closes, srLookbackPeriod, srMinTouchCount, srLevelTolerance);
    }

    // Entry conditions: All filters must align
    // Long: Close above both DEMA and Supertrend
    const longEntryCondition =
      latestClose > latestDEMA &&
      latestClose > latestSupertrend;
    
    // Short: Close below both DEMA and Supertrend
    const shortEntryCondition =
      latestClose < latestDEMA &&
      latestClose < latestSupertrend;

    // Use basic entry conditions without enhanced filters for now
    let longEntryWithFilter = longEntryCondition;
    let shortEntryWithFilter = shortEntryCondition;
    
    // Only apply trend strength filter if explicitly enabled
    const trendStrengthFilter = (config as any).trendStrengthFilter === true;
    if (trendStrengthFilter) {
      const minTrendStrength = (config as any).minTrendStrength || 0.01;
      const longTrendStrength = (latestClose - latestDEMA) / latestClose;
      const shortTrendStrength = (latestDEMA - latestClose) / latestClose;
      longEntryWithFilter = longEntryWithFilter && longTrendStrength >= minTrendStrength;
      shortEntryWithFilter = shortEntryWithFilter && shortTrendStrength >= minTrendStrength;
    }
    
    // Apply volatility filter to avoid choppy markets
    const volatilityFilterEnabled = (config as any).volatilityFilterEnabled === true;
    if (volatilityFilterEnabled) {
      const maxVolatility = (config as any).maxVolatility || 0.03;
      const currentVolatility = this.calculateVolatility(closes.slice(-20)); // 20-day volatility
      if (currentVolatility > maxVolatility) {
        longEntryWithFilter = false;
        shortEntryWithFilter = false;
        this.logger.debug(`Volatility filter: ${currentVolatility.toFixed(4)} > ${maxVolatility}, blocking entries`);
      }
    }
    
    this.logger.debug(`Basic filters - Long: ${longEntryWithFilter}, Short: ${shortEntryWithFilter}`);

    // Exit condition: Only when Supertrend flips (regardless of direction)
    const exitCondition = supertrendFlipped;

    const signals: StrategySignal[] = [];

    // Prioritize EXIT signals to prevent same-candle entry/exit
    // Generate exit signal when Supertrend flips
    if (exitCondition) {
      signals.push({
        type: 'EXIT',
        strength: 100, // High strength for exit signals
        confidence: 100, // High confidence for exit signals
        data: {
          direction: 'BOTH', // Generic exit signal - backtest orchestrator will handle direction
          price: latestClose,
          symbol: config.symbol,
          timeframe: config.timeframe,
          dema: latestDEMA,
          supertrend: latestSupertrend,
          signalType: 'EXIT'
        },
        timestamp: new Date(),
      });
    }

    // Only generate entry signals if there are no exit signals to prevent same-candle entry/exit
    if (signals.length === 0) {
      if (longEntryWithFilter) {
        signals.push({
          type: 'ENTRY',
          strength: this.calculateSignalStrength('LONG', latestClose, latestDEMA, latestSupertrend),
          confidence: this.calculateSignalConfidence('LONG', latestClose, latestDEMA, latestSupertrend),
          data: {
            direction: 'LONG',
            price: latestClose,
            symbol: config.symbol,
            timeframe: config.timeframe,
            dema: latestDEMA,
            supertrend: latestSupertrend,
            signalType: 'ENTRY'
          },
          timestamp: new Date(),
        });
      }

      if (shortEntryWithFilter) {
        signals.push({
          type: 'ENTRY',
          strength: this.calculateSignalStrength('SHORT', latestClose, latestDEMA, latestSupertrend),
          confidence: this.calculateSignalConfidence('SHORT', latestClose, latestDEMA, latestSupertrend),
          data: {
            direction: 'SHORT',
            price: latestClose,
            symbol: config.symbol,
            timeframe: config.timeframe,
            dema: latestDEMA,
            supertrend: latestSupertrend,
            signalType: 'ENTRY'
          },
          timestamp: new Date(),
        });
      }
    }

    // Diagnostics
    const diagnostics = {
      latestClose,
      latestDEMA,
      latestSupertrend,
      previousSupertrend,
      isBullishTrend,
      isBearishTrend,
      supertrendFlipped,
      longEntryCondition,
      shortEntryCondition,
      exitCondition,
      demaTrendingUp: demaResult.isAbovePrice,
      demaTrendingDown: demaResult.isBelowPrice,
    };

    this.logger.debug(`Trend-following diagnostics:`, diagnostics);

    return { signals, diagnostics };
  }

  /**
   * Calculate Support/Resistance levels
   */
  private calculateSupportResistance(
    highs: number[],
    lows: number[],
    closes: number[],
    lookbackPeriod: number,
    minTouchCount: number,
    tolerance: number
  ): { support: number | null; resistance: number | null } {
    if (highs.length < lookbackPeriod) {
      return { support: null, resistance: null };
    }

    const recentHighs = highs.slice(-lookbackPeriod);
    const recentLows = lows.slice(-lookbackPeriod);
    const recentCloses = closes.slice(-lookbackPeriod);

    // Find potential resistance levels (highs)
    const resistanceLevels: number[] = [];
    for (let i = 0; i < recentHighs.length; i++) {
      const level = recentHighs[i];
      let touchCount = 0;
      
      for (let j = 0; j < recentHighs.length; j++) {
        if (Math.abs(recentHighs[j] - level) / level <= tolerance) {
          touchCount++;
        }
      }
      
      if (touchCount >= minTouchCount) {
        resistanceLevels.push(level);
      }
    }

    // Find potential support levels (lows)
    const supportLevels: number[] = [];
    for (let i = 0; i < recentLows.length; i++) {
      const level = recentLows[i];
      let touchCount = 0;
      
      for (let j = 0; j < recentLows.length; j++) {
        if (Math.abs(recentLows[j] - level) / level <= tolerance) {
          touchCount++;
        }
      }
      
      if (touchCount >= minTouchCount) {
        supportLevels.push(level);
      }
    }

    // Return the most recent and strongest levels
    const resistance = resistanceLevels.length > 0 ? Math.max(...resistanceLevels) : null;
    const support = supportLevels.length > 0 ? Math.min(...supportLevels) : null;

    return { support, resistance };
  }

  /**
   * Calculate RSI indicator
   */
  private calculateRSI(prices: number[], period: number): number[] {
    if (prices.length < period + 1) return [];
    
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period; i < prices.length; i++) {
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
      
      // Update averages for next iteration
      if (i < prices.length - 1) {
        const change = prices[i + 1] - prices[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      }
    }
    
    return rsi;
  }

  /**
   * Calculate MACD indicator
   */
  private calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): {
    macd: number[];
    signal: number[];
    histogram: number[];
  } {
    if (prices.length < slowPeriod) {
      return { macd: [], signal: [], histogram: [] };
    }

    // Calculate EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // Calculate MACD line
    const macd: number[] = [];
    for (let i = 0; i < fastEMA.length; i++) {
      if (i < slowEMA.length) {
        macd.push(fastEMA[i] - slowEMA[i]);
      }
    }
    
    // Calculate signal line
    const signal = this.calculateEMA(macd, signalPeriod);
    
    // Calculate histogram
    const histogram: number[] = [];
    for (let i = 0; i < macd.length; i++) {
      if (i < signal.length) {
        histogram.push(macd[i] - signal[i]);
      }
    }
    
    return { macd, signal, histogram };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) return [];
    
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate subsequent EMAs
    for (let i = period; i < prices.length; i++) {
      ema.push((prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier)));
    }
    
    return ema;
  }

  /**
   * Calculate Supertrend indicator
   */
  private calculateSupertrend(
    highs: number[],
    lows: number[],
    closes: number[],
    atrSeries: number[],
    period: number,
    multiplier: number,
  ): number[] {
    const supertrend: number[] = [];
    const trend: number[] = [];
    
    // Initialize arrays
    for (let i = 0; i < closes.length; i++) {
      supertrend.push(0);
      trend.push(0);
    }

    // Calculate Supertrend for each candle
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        continue;
      }

      const atr = atrSeries[i - period + 1] || atrSeries[atrSeries.length - 1];
      const hl2 = (highs[i] + lows[i]) / 2;
      
      const upperBand = hl2 + (multiplier * atr);
      const lowerBand = hl2 - (multiplier * atr);

      let currentSupertrend: number;
      let currentTrend: number;

      if (i === period - 1) {
        // First calculation - start with upper band
        currentSupertrend = upperBand;
        currentTrend = 1;
      } else {
        const prevClose = closes[i - 1];
        const prevTrend = trend[i - 1];
        const prevSupertrend = supertrend[i - 1];

        if (prevTrend === 1) {
          // Previous trend was bullish
          currentSupertrend = Math.max(lowerBand, prevSupertrend);
          currentTrend = prevClose <= currentSupertrend ? -1 : 1;
        } else {
          // Previous trend was bearish
          currentSupertrend = Math.min(upperBand, prevSupertrend);
          currentTrend = prevClose >= currentSupertrend ? 1 : -1;
        }
      }

      supertrend[i] = currentSupertrend;
      trend[i] = currentTrend;
    }

    return supertrend;
  }

  /**
   * Check if Supertrend has flipped (changed trend direction)
   */
  private checkSupertrendFlip(supertrend: number[], closes: number[]): boolean {
    if (supertrend.length < 2 || closes.length < 2) {
      return false;
    }

    const currentClose = closes[closes.length - 1];
    const previousClose = closes[closes.length - 2];
    const currentSupertrend = supertrend[supertrend.length - 1];
    const previousSupertrend = supertrend[supertrend.length - 2];
    
    // Determine current and previous trend directions
    const currentTrend = currentClose > currentSupertrend ? 1 : -1;
    const previousTrend = previousClose > previousSupertrend ? 1 : -1;
    
    // Supertrend has flipped if trend direction changed
    return currentTrend !== previousTrend;
  }

  /**
   * Calculate DEMA manually for accurate results
   * This matches TradingView's DEMA calculation
   */
  private calculateManualDEMA(values: number[], period: number): number[] {
    if (values.length < period) {
      return [];
    }

    const alpha = 2 / (period + 1);
    
    // First EMA
    let ema1 = values[0];
    const ema1Series = [ema1];
    for (let i = 1; i < values.length; i++) {
      ema1 = (values[i] - ema1) * alpha + ema1;
      ema1Series.push(ema1);
    }
    
    // Second EMA
    let ema2 = ema1Series[0];
    const ema2Series = [ema2];
    for (let i = 1; i < ema1Series.length; i++) {
      ema2 = (ema1Series[i] - ema2) * alpha + ema2;
      ema2Series.push(ema2);
    }
    
    // DEMA = 2 * EMA1 - EMA2
    const dema: number[] = [];
    for (let i = 0; i < ema2Series.length; i++) {
      dema.push(2 * ema1Series[i] - ema2Series[i]);
    }
    
    // Pad with NaN values at the beginning to align with input length
    const alignmentOffset = values.length - dema.length;
    if (alignmentOffset > 0) {
      const padded: number[] = new Array(alignmentOffset).fill(Number.NaN);
      return padded.concat(dema);
    }
    
    return dema;
  }

  /**
   * Calculate signal strength (0-100)
   */
  private calculateSignalStrength(
    direction: 'LONG' | 'SHORT',
    price: number,
    dema: number,
    supertrend: number,
  ): number {
    let strength = 50; // Base strength

    // Increase strength based on distance from DEMA
    const demaDistance = Math.abs(price - dema) / dema;
    strength += Math.min(demaDistance * 1000, 30);

    // Increase strength based on distance from Supertrend
    const supertrendDistance = Math.abs(price - supertrend) / supertrend;
    strength += Math.min(supertrendDistance * 1000, 20);

    return Math.min(strength, 100);
  }

  /**
   * Calculate signal confidence (0-100)
   */
  private calculateSignalConfidence(
    direction: 'LONG' | 'SHORT',
    price: number,
    dema: number,
    supertrend: number,
  ): number {
    let confidence = 60; // Base confidence

    // Increase confidence if both DEMA and Supertrend agree
    const demaAgrees = (direction === 'LONG' && price > dema) || (direction === 'SHORT' && price < dema);
    const supertrendAgrees = (direction === 'LONG' && price > supertrend) || (direction === 'SHORT' && price < supertrend);
    
    if (demaAgrees && supertrendAgrees) {
      confidence += 30;
    } else if (demaAgrees || supertrendAgrees) {
      confidence += 15;
    }

    return Math.min(confidence, 100);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
}
