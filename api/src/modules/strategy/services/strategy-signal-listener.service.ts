import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from '../entities/strategy.entity';
import {
  EmaGapAtrStrategyService,
  EmaGapAtrConfig,
} from './ema-gap-atr-strategy.service';
import { CandleQueryService } from '../../trading/services/candle-query.service';
import { OptionStrikeCalculatorService } from '../../trading/services/option-strike-calculator.service';
import { TimeframeType } from '../../trading/schemas/candle.schema';

interface TradingStrategyEvaluationEvent {
  subscriptionId?: string;
  symbol: string;
  timestamp: number;
  timeframes: TimeframeType[];
}

@Injectable()
export class StrategySignalListenerService {
  private readonly logger = new Logger(StrategySignalListenerService.name);

  constructor(
    @InjectRepository(Strategy)
    private readonly strategyRepository: Repository<Strategy>,
    private readonly emaGapStrategy: EmaGapAtrStrategyService,
    private readonly candleQuery: CandleQueryService,
    private readonly optionStrikeCalculator: OptionStrikeCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('trading.strategyEvaluation')
  async handleStrategyEvaluation(
    event: TradingStrategyEvaluationEvent,
  ): Promise<void> {
    const strategies = await this.strategyRepository.find({
      where: {
        isActive: true,
        underlyingSymbol: event.symbol,
      },
    });

    if (strategies.length === 0) {
      return;
    }

    for (const strategy of strategies) {
      const configPayload = strategy.config || {};
      const strategyType = configPayload.strategyType || configPayload.type;

      if (strategyType !== 'EMA_GAP_ATR') {
        continue;
      }

      const parameters = configPayload.parameters || configPayload.config || {};
      const candlesToFetch = Number(
        configPayload.candlesToFetch || parameters.candlesToFetch || 200,
      );

      const emaConfig = this.toEmaGapConfig(strategy, parameters);
      if (!emaConfig) {
        this.logger.warn(
          `Strategy ${strategy.id} has invalid EMA_GAP_ATR configuration`,
        );
        continue;
      }

      const candles = await this.candleQuery.getRecentCandles(
        emaConfig.symbol,
        emaConfig.timeframe,
        candlesToFetch,
      );

      if (!candles.length) {
        this.logger.warn(
          `No candle data for strategy ${strategy.id} ${emaConfig.symbol}`,
        );
        continue;
      }

      const evaluation = this.emaGapStrategy.evaluate(emaConfig, candles);

      if (!evaluation.signals.length) {
        this.logger.debug(`Strategy ${strategy.id} produced no signals`);
        continue;
      }

      for (const signal of evaluation.signals) {
        this.logger.log(
          `Strategy ${strategy.id} generated ${signal.type} signal (${signal.data.direction})`,
        );

        // Calculate option strikes if options are enabled
        if (emaConfig.options?.enabled && signal.data.options) {
          try {
            const strikes = await this.optionStrikeCalculator.calculateStrikes(
              emaConfig.symbol,
              signal.data.price,
              signal.data.options.strikeSelection,
            );

            signal.data.optionStrikes = strikes;
            this.logger.log(
              `Calculated ${strikes.length} option strikes for ${emaConfig.symbol}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to calculate option strikes for ${emaConfig.symbol}:`,
              error,
            );
          }
        }

        this.eventEmitter.emit('trading.strategyEvaluated', {
          symbol: emaConfig.symbol,
          timestamp: event.timestamp,
          strategyId: strategy.id,
          signal,
          diagnostics: evaluation.diagnostics,
          timeframes: event.timeframes,
        });
      }
    }
  }

  private toEmaGapConfig(
    strategy: Strategy,
    params: Record<string, any>,
  ): EmaGapAtrConfig | null {
    try {
      const timeframe =
        (params.timeframe as TimeframeType) ||
        (strategy.timeframe as TimeframeType) ||
        '15m';

      return {
        id: strategy.id,
        name: strategy.name,
        symbol: strategy.underlyingSymbol,
        timeframe,
        emaFastPeriod: Number(params.emaFastPeriod ?? params.emaFast ?? 9),
        emaSlowPeriod: Number(params.emaSlowPeriod ?? params.emaSlow ?? 20),
        atrPeriod: Number(params.atrPeriod ?? 14),
        atrMultiplierEntry: Number(params.atrMultiplierEntry ?? 1.5),
        atrMultiplierUnwind: Number(params.atrMultiplierUnwind ?? 0.75),
        capital: Number(params.capital ?? 100000),
        maxLossPct: Number(params.maxLossPct ?? 0.01),
        positionSize: Number(params.positionSize ?? 1),
        maxLots: Number(params.maxLots ?? 5),
        pyramidingEnabled: Boolean(params.pyramidingEnabled ?? true),
        exitMode: params.exitMode ?? 'FIFO',
        misExitTime: params.misExitTime ?? '15:15',
        cncExitTime: params.cncExitTime ?? '15:15',
        strongCandleThreshold: Number(params.strongCandleThreshold ?? 0.6),
        gapUpDownThreshold: Number(params.gapUpDownThreshold ?? 0.5),
        slopeLookback: Number(params.slopeLookback ?? params.slope_n ?? 3),
        rsiPeriod: Number(params.rsiPeriod ?? 14),
        rsiEntryLong: Number(params.rsiEntryLong ?? 50),
        rsiEntryShort: Number(params.rsiEntryShort ?? 50),
        rsiExitLong: Number(params.rsiExitLong ?? 50),
        rsiExitShort: Number(params.rsiExitShort ?? 50),
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
