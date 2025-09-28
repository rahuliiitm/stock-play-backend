import { Injectable, Logger } from '@nestjs/common';
import { Strategy } from '../entities/strategy.entity';
import {
  EmaGapAtrStrategyService,
  EmaGapAtrConfig,
} from './ema-gap-atr-strategy.service';
import { CandleQueryService } from '../../trading/services/candle-query.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimeframeType } from '../../trading/schemas/candle.schema';

@Injectable()
export class TradingStrategyRunnerService {
  private readonly logger = new Logger(TradingStrategyRunnerService.name);

  constructor(
    private readonly emaGapStrategy: EmaGapAtrStrategyService,
    private readonly candleQueryService: CandleQueryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async runStrategy(strategy: Strategy): Promise<void> {
    const configPayload = strategy.config || {};
    const strategyType = configPayload.strategyType || configPayload.type;

    if (strategyType !== 'EMA_GAP_ATR') {
      return;
    }

    const params = configPayload.parameters || configPayload.config || {};
    const candlesToFetch = Number(
      configPayload.candlesToFetch || params.candlesToFetch || 200,
    );

    const config = this.buildConfig(strategy, params);
    if (!config) {
      this.logger.warn(
        `Invalid EMA_GAP_ATR config for strategy ${strategy.id}`,
      );
      return;
    }

    const candles = await this.candleQueryService.getRecentCandles(
      config.symbol,
      config.timeframe,
      candlesToFetch,
    );

    if (!candles.length) {
      this.logger.warn(
        `No candle data for strategy ${strategy.id} (${config.symbol})`,
      );
      return;
    }

    const evaluation = this.emaGapStrategy.evaluate(config, candles);

    for (const signal of evaluation.signals) {
      this.logger.log(
        `Strategy ${strategy.id} signal: ${signal.type} ${signal.data.direction}`,
      );
      this.eventEmitter.emit('strategy.signal', {
        strategyId: strategy.id,
        signal,
        diagnostics: evaluation.diagnostics,
      });
    }
  }

  private buildConfig(
    strategy: Strategy,
    params: Record<string, any>,
  ): EmaGapAtrConfig | null {
    try {
      return {
        id: strategy.id,
        name: strategy.name,
        symbol: strategy.underlyingSymbol,
        timeframe: (params.timeframe || strategy.timeframe) as TimeframeType,
        emaFastPeriod: Number(params.emaFastPeriod ?? params.emaFast ?? 9),
        emaSlowPeriod: Number(params.emaSlowPeriod ?? params.emaSlow ?? 20),
        atrPeriod: Number(params.atrPeriod ?? 14),
        atrMultiplierEntry: Number(params.atrMultiplierEntry ?? 1.5),
        atrMultiplierUnwind: Number(params.atrMultiplierUnwind ?? 0.75),
        slopeLookback: Number(params.slopeLookback ?? params.slope_n ?? 3),
        rsiPeriod: Number(params.rsiPeriod ?? 14),
        rsiEntryLong: Number(params.rsiEntryLong ?? 50),
        rsiEntryShort: Number(params.rsiEntryShort ?? 50),
        rsiExitLong: Number(params.rsiExitLong ?? 50),
        rsiExitShort: Number(params.rsiExitShort ?? 50),
        capital: Number(params.capital ?? 100000),
        maxLossPct: Number(params.maxLossPct ?? 0.01),
        positionSize: Number(params.positionSize ?? 1),
        maxLots: Number(params.maxLots ?? params.pyramidingMaxLots ?? 5),
        pyramidingEnabled: Boolean(params.pyramidingEnabled ?? true),
        exitMode: params.exitMode ?? 'FIFO',
        misExitTime: params.misExitTime ?? '15:15',
        cncExitTime: params.cncExitTime ?? '15:15',
        strongCandleThreshold: Number(params.strongCandleThreshold ?? 0.6),
        gapUpDownThreshold: Number(params.gapUpDownThreshold ?? 0.5),
        options: {
          enabled: Boolean(
            params.optionsEnabled ?? params.enableOptions ?? false,
          ),
          strikeSelection: {
            callStrikes: (params.callStrikes ?? ['ATM'])
              .split(',')
              .map((s) => s.trim()),
            putStrikes: (params.putStrikes ?? ['ATM'])
              .split(',')
              .map((s) => s.trim()),
            expiryDays: Number(params.expiryDays ?? 7),
          },
          lotSize: Number(params.lotSize ?? 50),
          strikeIncrement: Number(params.strikeIncrement ?? 50),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to build EMA_GAP_ATR config for strategy ${strategy.id}`,
        error,
      );
      return null;
    }
  }
}
