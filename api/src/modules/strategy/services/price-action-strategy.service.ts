import { Injectable, Logger } from '@nestjs/common';
import { IStrategy, CandleData, StrategyConfig, StrategyEvaluation, StrategySignal, StrategyContext } from '../interfaces/strategy.interface';
import { StrategyIndicatorsService } from '../indicators/strategy-indicators.service';

export interface PriceActionConfig extends StrategyConfig {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  atrPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
}

interface IndicatorDirectionState {
  supertrendSignalTime?: number;
  macdSignalTime?: number;
  lastEntryTimestamp?: number;
}

interface IndicatorSignalState {
  long: IndicatorDirectionState;
  short: IndicatorDirectionState;
  lastSupertrendDirection?: 'BULLISH' | 'BEARISH';
}

type MacdValue = {
  MACD: number;
  signal: number;
  histogram?: number;
};

@Injectable()
export class PriceActionStrategyService implements IStrategy {
  readonly name = 'price-action';
  readonly version = '1.0.0';
  readonly description = 'Price Action Strategy with Supertrend(10,2) and MACD';
  private readonly logger = new Logger(PriceActionStrategyService.name);
  private readonly signalStates = new Map<string, IndicatorSignalState>();

  constructor(
    private readonly indicatorsService: StrategyIndicatorsService,
  ) {}

  async evaluate(
    config: PriceActionConfig,
    candles: CandleData[],
    context?: StrategyContext,
  ): Promise<StrategyEvaluation> {
    if (candles.length < Math.max(config.supertrendPeriod, config.macdSlow) + 10) {
      this.logger.debug(`Insufficient data: ${candles.length} candles`);
      return { signals: [], diagnostics: { error: 'Insufficient data' } };
    }

    try {
      // Calculate indicators using centralized service
      const supertrendResult = this.indicatorsService.calculateSupertrend(
        candles,
        config.supertrendPeriod,
        config.supertrendMultiplier,
      );

      const macdResult = this.indicatorsService.calculateMACD(
        candles,
        config.macdFast,
        config.macdSlow,
        config.macdSignal,
      );

      if (!supertrendResult || !macdResult) {
        this.logger.debug('Insufficient indicator data');
        return { signals: [], diagnostics: { error: 'Insufficient indicator data' } };
      }

      const latestCandle = candles[candles.length - 1];
      const latestClose = latestCandle.close;
      const latestSupertrend = supertrendResult.supertrend;
      const isSupertrendBullish = supertrendResult.isBullish;
      const isSupertrendBearish = supertrendResult.isBearish;

      const latestMacd = macdResult.macd;
      const latestMacdSignal = macdResult.signal;
      const macdSeries = Array.isArray(macdResult.metadata?.allValues)
        ? (macdResult.metadata.allValues as MacdValue[])
        : [];

      let macdBullish = false;
      let macdBearish = false;
      if (macdSeries.length >= 2 && macdSeries[macdSeries.length - 2] && macdSeries[macdSeries.length - 1]) {
        const prev = macdSeries[macdSeries.length - 2];
        const curr = macdSeries[macdSeries.length - 1];
        const crossedAbove = prev.MACD <= prev.signal && curr.MACD > curr.signal;
        const crossedBelow = prev.MACD >= prev.signal && curr.MACD < curr.signal;
        const belowZero = curr.MACD < 0 && curr.signal < 0;
        const aboveZero = curr.MACD > 0 && curr.signal > 0;
        macdBullish = crossedAbove && belowZero;
        macdBearish = crossedBelow && aboveZero;
      }

      // Use the pre-calculated signals from the indicators service
      const supertrendBullish = isSupertrendBullish;
      const supertrendBearish = isSupertrendBearish;

      this.logger.debug(`Price Action Strategy Evaluation:`);
      this.logger.debug(`  Close: ${latestClose.toFixed(2)}`);
      this.logger.debug(`  Supertrend: ${latestSupertrend.toFixed(2)}`);
      this.logger.debug(`  MACD: ${latestMacd.toFixed(4)}`);
      this.logger.debug(`  MACD Signal: ${macdResult.signal.toFixed(4)}`);
      this.logger.debug(`  Supertrend Bullish: ${supertrendBullish}`);
      this.logger.debug(`  Supertrend Bearish: ${supertrendBearish}`);
      this.logger.debug(`  MACD Bullish (zero-line cross): ${macdBullish}`);
      this.logger.debug(`  MACD Bearish (zero-line cross): ${macdBearish}`);

      const signalState = this.getOrCreateSignalState(config);
      const longState = signalState.long;
      const shortState = signalState.short;
      const previousDirection = signalState.lastSupertrendDirection;
      let supertrendFlipped = false;

      const latestTimestamp = latestCandle.timestamp;

      // Update indicator state trackers for sequential signal detection
      if (supertrendBullish) {
        longState.supertrendSignalTime = latestTimestamp;
        shortState.supertrendSignalTime = undefined;
        if (previousDirection === 'BEARISH') {
          supertrendFlipped = true;
        }
        signalState.lastSupertrendDirection = 'BULLISH';
      } else if (supertrendBearish) {
        shortState.supertrendSignalTime = latestTimestamp;
        longState.supertrendSignalTime = undefined;
        if (previousDirection === 'BULLISH') {
          supertrendFlipped = true;
        }
        signalState.lastSupertrendDirection = 'BEARISH';
      } else {
        signalState.lastSupertrendDirection = undefined;
      }

      if (macdBullish) {
        longState.macdSignalTime = latestTimestamp;
        shortState.macdSignalTime = undefined;
      } else if (macdBearish) {
        shortState.macdSignalTime = latestTimestamp;
        longState.macdSignalTime = undefined;
      } else {
        longState.macdSignalTime = undefined;
        shortState.macdSignalTime = undefined;
      }

      this.logger.debug(`  Supertrend Flipped: ${supertrendFlipped}`);

      // Get current position state from context
      this.logger.debug(`  Context received: ${JSON.stringify(context)}`);
      this.logger.debug(`  Active trades length: ${context?.activeTrades?.length || 0}`);
      
      const currentPosition = (context && context.activeTrades && context.activeTrades.length > 0) ? context.activeTrades[0] : null;
      const isInPosition = currentPosition !== null;
      const positionDirection = currentPosition?.direction;

      this.logger.debug(`  Current Position: ${isInPosition ? positionDirection : 'NONE'}`);

      // While in a position, avoid accumulating pending entry signals for the same direction
      if (isInPosition) {
        if (positionDirection === 'LONG') {
          longState.supertrendSignalTime = undefined;
          longState.macdSignalTime = undefined;
        } else if (positionDirection === 'SHORT') {
          shortState.supertrendSignalTime = undefined;
          shortState.macdSignalTime = undefined;
        }
      }

      // State Machine Logic
      const signals: StrategySignal[] = [];

      const previousCandle = candles.length > 1 ? candles[candles.length - 2] : null;
      const timeframeMs = previousCandle ? latestTimestamp - previousCandle.timestamp : 0;
      const maxSignalGap = timeframeMs > 0 ? timeframeMs * 2 : Number.POSITIVE_INFINITY;

      if (!isInPosition) {
        // NO POSITION STATE: Wait for both indicators to align
        const longEntryCondition = this.shouldEnterLong(longState, latestTimestamp, maxSignalGap);
        const shortEntryCondition = this.shouldEnterShort(shortState, latestTimestamp, maxSignalGap);

        this.logger.debug(`  Long Entry: ${longEntryCondition}`);
        this.logger.debug(`  Short Entry: ${shortEntryCondition}`);

        if (longEntryCondition) {
          signals.push({
            type: 'ENTRY',
            strength: 80,
            confidence: 75,
            data: {
              direction: 'LONG',
              price: latestClose,
              symbol: latestCandle.symbol,
              timeframe: latestCandle.timeframe,
              metadata: {
                supertrend: latestSupertrend,
                macd: latestMacd,
                macdSignal: macdResult.signal,
                entrySupertrend: latestSupertrend, // Store the ST value from before entry
              },
            },
            timestamp: new Date(latestCandle.timestamp),
          });

          // Reset pending signals after executing entry
          longState.supertrendSignalTime = undefined;
          longState.macdSignalTime = undefined;
          longState.lastEntryTimestamp = latestTimestamp;
          shortState.supertrendSignalTime = undefined;
          shortState.macdSignalTime = undefined;
        }

        if (shortEntryCondition) {
          signals.push({
            type: 'ENTRY',
            strength: 80,
            confidence: 75,
            data: {
              direction: 'SHORT',
              price: latestClose,
              symbol: latestCandle.symbol,
              timeframe: latestCandle.timeframe,
              metadata: {
                supertrend: latestSupertrend,
                macd: latestMacd,
                macdSignal: macdResult.signal,
                entrySupertrend: latestSupertrend, // Store the ST value from before entry
              },
            },
            timestamp: new Date(latestCandle.timestamp),
          });

          // Reset pending signals after executing entry
          shortState.supertrendSignalTime = undefined;
          shortState.macdSignalTime = undefined;
          shortState.lastEntryTimestamp = latestTimestamp;
          longState.supertrendSignalTime = undefined;
          longState.macdSignalTime = undefined;
        }
      } else {
        // IN POSITION STATE: Check for exit conditions
        const entrySupertrend = (currentPosition as any)?.metadata?.entrySupertrend;
        
        // Exit condition 1: Price closes below/above entry Supertrend value
        let priceExitCondition = false;
        let priceExitReason = '';
        
      if (positionDirection === 'LONG' && entrySupertrend && latestClose < entrySupertrend) {
          priceExitCondition = true;
          priceExitReason = 'PRICE_BELOW_ENTRY_SUPERTREND';
      } else if (positionDirection === 'SHORT' && entrySupertrend && latestClose > entrySupertrend) {
          priceExitCondition = true;
          priceExitReason = 'PRICE_ABOVE_ENTRY_SUPERTREND';
        }
        
        // Exit condition 2: Supertrend flip
        let supertrendFlipExit = false;
        if (supertrendFlipped) {
          if (positionDirection === 'LONG' && supertrendBearish) {
            supertrendFlipExit = true;
          } else if (positionDirection === 'SHORT' && supertrendBullish) {
            supertrendFlipExit = true;
          }
        }
        
        this.logger.debug(`  Price Exit Condition: ${priceExitCondition} (${priceExitReason})`);
        this.logger.debug(`  Supertrend Flip Exit: ${supertrendFlipExit}`);

        if (priceExitCondition || supertrendFlipExit) {
          signals.push({
            type: 'EXIT',
            strength: 90,
            confidence: 85,
            data: {
              direction: 'BOTH', // Exit all positions
              price: latestClose,
              symbol: latestCandle.symbol,
              timeframe: latestCandle.timeframe,
              metadata: {
                supertrend: latestSupertrend,
                macd: latestMacd,
                macdSignal: macdResult.signal,
                reason: priceExitCondition ? priceExitReason : 'SUPERTREND_FLIP',
                entrySupertrend: entrySupertrend,
              },
            },
            timestamp: new Date(latestCandle.timestamp),
          });
        }
      }

      return {
        signals,
        diagnostics: {
          supertrend: latestSupertrend,
          macd: latestMacd,
          macdSignal: macdResult.signal,
          isInPosition,
          positionDirection,
          supertrendFlipped,
          lastSupertrendDirection: signalState.lastSupertrendDirection,
        },
      };
    } catch (error) {
      this.logger.error(`Error in price action strategy evaluation: ${error.message}`);
      return { signals: [], diagnostics: { error: error.message } };
    }
  }

  private shouldEnterLong(state: IndicatorDirectionState, currentTimestamp: number, maxGap: number): boolean {
    if (!state.supertrendSignalTime || !state.macdSignalTime) {
      return false;
    }

    const firstSignal = Math.min(state.supertrendSignalTime, state.macdSignalTime);
    const lastSignal = Math.max(state.supertrendSignalTime, state.macdSignalTime);

    if (currentTimestamp - firstSignal > maxGap) {
      state.supertrendSignalTime = undefined;
      state.macdSignalTime = undefined;
      return false;
    }

    if (state.lastEntryTimestamp && state.lastEntryTimestamp === currentTimestamp) {
      return false;
    }

    return lastSignal <= currentTimestamp;
  }

  private shouldEnterShort(state: IndicatorDirectionState, currentTimestamp: number, maxGap: number): boolean {
    if (!state.supertrendSignalTime || !state.macdSignalTime) {
      return false;
    }

    const firstSignal = Math.min(state.supertrendSignalTime, state.macdSignalTime);
    const lastSignal = Math.max(state.supertrendSignalTime, state.macdSignalTime);

    if (currentTimestamp - firstSignal > maxGap) {
      state.supertrendSignalTime = undefined;
      state.macdSignalTime = undefined;
      return false;
    }

    if (state.lastEntryTimestamp && state.lastEntryTimestamp === currentTimestamp) {
      return false;
    }

    return lastSignal <= currentTimestamp;
  }

  private getOrCreateSignalState(config: PriceActionConfig): IndicatorSignalState {
    const stateKey = `${config.symbol}:${config.timeframe}`;
    let state = this.signalStates.get(stateKey);
    if (!state) {
      state = {
        long: {},
        short: {},
        lastSupertrendDirection: undefined,
      };
      this.signalStates.set(stateKey, state);
    }
    return state;
  }

  private calculateSupertrend(
    candles: CandleData[],
    period: number,
    multiplier: number,
    atrPeriod: number,
  ): number[] {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    const atr = this.calculateATR(highs, lows, closes, atrPeriod);
    const supertrend: number[] = [];
    let trend = 1; // 1 for bullish, -1 for bearish

    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        supertrend.push(0);
        continue;
      }

      const hl2 = (highs[i] + lows[i]) / 2;
      const upperBand = hl2 + (multiplier * atr[i]);
      const lowerBand = hl2 - (multiplier * atr[i]);

      let finalUpperBand = upperBand;
      let finalLowerBand = lowerBand;

      if (i > 0 && supertrend[i - 1] !== 0) {
        if (upperBand < supertrend[i - 1] || closes[i - 1] > supertrend[i - 1]) {
          finalUpperBand = supertrend[i - 1];
        }
        if (lowerBand > supertrend[i - 1] || closes[i - 1] < supertrend[i - 1]) {
          finalLowerBand = supertrend[i - 1];
        }
      }

      if (i === 0 || supertrend[i - 1] === 0) {
        supertrend.push(finalLowerBand);
        trend = 1;
      } else {
        if (trend === 1) {
          if (closes[i] <= finalLowerBand) {
            trend = -1;
            supertrend.push(finalUpperBand);
          } else {
            supertrend.push(finalLowerBand);
          }
        } else {
          if (closes[i] >= finalUpperBand) {
            trend = 1;
            supertrend.push(finalLowerBand);
          } else {
            supertrend.push(finalUpperBand);
          }
        }
      }
    }

    return supertrend;
  }

  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
  ): number[] {
    const tr: number[] = [];
    const atr: number[] = [];

    for (let i = 0; i < highs.length; i++) {
      if (i === 0) {
        tr.push(highs[i] - lows[i]);
      } else {
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        tr.push(Math.max(tr1, tr2, tr3));
      }

      if (i < period - 1) {
        atr.push(0);
      } else if (i === period - 1) {
        const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
      } else {
        const prevAtr = atr[i - 1];
        const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
        atr.push(currentAtr);
      }
    }

    return atr;
  }

  private calculateMACD(
    closes: number[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number,
  ): Array<{ macd: number; signal: number; histogram: number }> {
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    const macdLine: number[] = [];
    const macdResult: Array<{ macd: number; signal: number; histogram: number }> = [];

    // Calculate MACD line
    for (let i = 0; i < closes.length; i++) {
      if (emaFast[i] === 0 || emaSlow[i] === 0) {
        macdLine.push(0);
      } else {
        macdLine.push(emaFast[i] - emaSlow[i]);
      }
    }

    // Calculate signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    // Calculate histogram
    for (let i = 0; i < closes.length; i++) {
      const macd = macdLine[i];
      const signal = signalLine[i];
      const histogram = macd - signal;

      macdResult.push({
        macd,
        signal,
        histogram,
      });
    }

    return macdResult;
  }

  private calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push(data[i]);
      } else {
        ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
      }
    }

    return ema;
  }

  private checkSupertrendFlip(
    latestSupertrend: number,
    currentSupertrend: number,
    currentClose: number,
  ): boolean {
    // Check if Supertrend direction changed
    const previousBullish = currentClose > latestSupertrend;
    const currentBullish = currentClose > currentSupertrend;
    
    return previousBullish !== currentBullish;
  }

  validateConfig(config: any): any {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.supertrendPeriod || config.supertrendPeriod < 1) {
      errors.push('supertrendPeriod must be a positive number');
    }

    if (!config.supertrendMultiplier || config.supertrendMultiplier < 0) {
      errors.push('supertrendMultiplier must be a positive number');
    }

    if (!config.macdFast || config.macdFast < 1) {
      errors.push('macdFast must be a positive number');
    }

    if (!config.macdSlow || config.macdSlow < config.macdFast) {
      errors.push('macdSlow must be greater than macdFast');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getDefaultConfig(): PriceActionConfig {
    return {
      id: 'price-action-default',
      name: 'Price Action Strategy',
      symbol: 'NIFTY',
      timeframe: '1d',
      supertrendPeriod: 10,
      supertrendMultiplier: 2.0,
      atrPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    };
  }

  getWarmupPeriod(config: PriceActionConfig): number {
    // Calculate warm-up period based on the longest indicator period
    const supertrendWarmup = Math.max(config.supertrendPeriod, config.atrPeriod) + 10; // ST needs ATR + buffer
    const macdWarmup = config.macdSlow + config.macdSignal + 10; // MACD needs slow + signal + buffer
    
    // Return the maximum warm-up period needed
    const warmupPeriod = Math.max(supertrendWarmup, macdWarmup);
    
    this.logger.debug(`Warm-up period calculation for ${config.name}:`);
    this.logger.debug(`  Supertrend warmup: ${supertrendWarmup} (ST: ${config.supertrendPeriod}, ATR: ${config.atrPeriod})`);
    this.logger.debug(`  MACD warmup: ${macdWarmup} (Slow: ${config.macdSlow}, Signal: ${config.macdSignal})`);
    this.logger.debug(`  Final warmup period: ${warmupPeriod} candles`);
    
    return warmupPeriod;
  }
}
