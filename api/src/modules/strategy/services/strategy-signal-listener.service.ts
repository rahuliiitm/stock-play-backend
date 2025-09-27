import { Injectable, Logger } from '@nestjs/common'
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Strategy } from '../entities/strategy.entity'
import { EmaGapAtrStrategyService, EmaGapAtrConfig } from './ema-gap-atr-strategy.service'
import { CandleQueryService } from '../../trading/services/candle-query.service'
import { OptionStrikeCalculatorService } from '../../trading/services/option-strike-calculator.service'
import { TimeframeType } from '../../trading/schemas/candle.schema'

interface TradingStrategyEvaluationEvent {
  subscriptionId?: string
  symbol: string
  timestamp: number
  timeframes: TimeframeType[]
}

@Injectable()
export class StrategySignalListenerService {
  private readonly logger = new Logger(StrategySignalListenerService.name)

  constructor(
    @InjectRepository(Strategy)
    private readonly strategyRepository: Repository<Strategy>,
    private readonly emaGapStrategy: EmaGapAtrStrategyService,
    private readonly candleQuery: CandleQueryService,
    private readonly optionStrikeCalculator: OptionStrikeCalculatorService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @OnEvent('trading.strategyEvaluation')
  async handleStrategyEvaluation(event: TradingStrategyEvaluationEvent): Promise<void> {
    const strategies = await this.strategyRepository.find({
      where: {
        isActive: true,
        underlyingSymbol: event.symbol
      }
    })

    if (strategies.length === 0) {
      return
    }

    for (const strategy of strategies) {
      const configPayload = strategy.config || {}
      const strategyType = configPayload.strategyType || configPayload.type

      if (strategyType !== 'EMA_GAP_ATR') {
        continue
      }

      const parameters = configPayload.parameters || configPayload.config || {}
      const candlesToFetch = Number(configPayload.candlesToFetch || parameters.candlesToFetch || 200)

      const emaConfig = this.toEmaGapConfig(strategy, parameters)
      if (!emaConfig) {
        this.logger.warn(`Strategy ${strategy.id} has invalid EMA_GAP_ATR configuration`)
        continue
      }

      const candles = await this.candleQuery.getRecentCandles(
        emaConfig.symbol,
        emaConfig.timeframe,
        candlesToFetch
      )

      if (!candles.length) {
        this.logger.warn(`No candle data for strategy ${strategy.id} ${emaConfig.symbol}`)
        continue
      }

      const evaluation = this.emaGapStrategy.evaluate(emaConfig, candles)

      if (!evaluation.signals.length) {
        this.logger.debug(`Strategy ${strategy.id} produced no signals`)
        continue
      }

      for (const signal of evaluation.signals) {
        this.logger.log(`Strategy ${strategy.id} generated ${signal.type} signal (${signal.data.direction})`)

        // Calculate option strikes if options are enabled
        if (emaConfig.options?.enabled && signal.data.options) {
          try {
            const strikes = await this.optionStrikeCalculator.calculateStrikes(
              emaConfig.symbol,
              signal.data.price,
              signal.data.options.strikeSelection
            )
            
            signal.data.optionStrikes = strikes
            this.logger.log(`Calculated ${strikes.length} option strikes for ${emaConfig.symbol}`)
          } catch (error) {
            this.logger.error(`Failed to calculate option strikes for ${emaConfig.symbol}:`, error)
          }
        }

        this.eventEmitter.emit('trading.strategyEvaluated', {
          symbol: emaConfig.symbol,
          timestamp: event.timestamp,
          strategyId: strategy.id,
          signal,
          diagnostics: evaluation.diagnostics,
          timeframes: event.timeframes
        })
      }
    }
  }

  private toEmaGapConfig(strategy: Strategy, params: Record<string, any>): EmaGapAtrConfig | null {
    try {
      const timeframe = params.timeframe as TimeframeType || (strategy.timeframe as TimeframeType) || '15m'

      return {
        id: strategy.id,
        name: strategy.name,
        symbol: strategy.underlyingSymbol,
        timeframe,
        emaFastPeriod: Number(params.emaFastPeriod ?? params.emaFast ?? 9),
        emaSlowPeriod: Number(params.emaSlowPeriod ?? params.emaSlow ?? 20),
        atrPeriod: Number(params.atrPeriod ?? 14),
        minGapThreshold: Number(params.minGapThreshold ?? params.gapAbsThreshold ?? 0),
        minGapMultiplier: Number(params.minGapMultiplier ?? params.gapNormThreshold ?? 0.3),
        slopeLookback: Number(params.slopeLookback ?? params.slope_n ?? 3),
        slopeMin: params.slopeMin !== undefined ? Number(params.slopeMin) : undefined,
        rsiPeriod: Number(params.rsiPeriod ?? 14),
        rsiThreshold: Number(params.rsiThreshold ?? 50),
        adxPeriod: Number(params.adxPeriod ?? 14),
        adxThreshold: Number(params.adxThreshold ?? 25),
        pyramiding: {
          multiplier: Number(params.multiplier ?? params.pyramidingMultiplier ?? 0.6),
          maxLots: Number(params.maxLots ?? params.pyramidingMaxLots ?? 3)
        },
        risk: {
          maxLossPerLot: Number(params.maxLossPerLot ?? 0),
          trailingAtrMultiplier: Number(params.trailing_stop_ATR_multiplier ?? params.trailingAtrMultiplier ?? 1)
        },
        options: {
          enabled: Boolean(params.optionsEnabled ?? params.enableOptions ?? false),
          strikeSelection: {
            callStrikes: (params.callStrikes ?? ['ATM']).split(',').map(s => s.trim()),
            putStrikes: (params.putStrikes ?? ['ATM']).split(',').map(s => s.trim()),
            expiryDays: Number(params.expiryDays ?? 7) // Default to next Tuesday
          },
          lotSize: Number(params.lotSize ?? 50),
          strikeIncrement: Number(params.strikeIncrement ?? 50)
        }
      }
    } catch (error) {
      this.logger.error(`Failed to build EMA_GAP_ATR config for strategy ${strategy.id}`, error)
      return null
    }
  }
}


