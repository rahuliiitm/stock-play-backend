import { Injectable, Logger } from '@nestjs/common'
import { Strategy } from '../entities/strategy.entity'
import { EmaGapAtrStrategyService, EmaGapAtrConfig } from './ema-gap-atr-strategy.service'
import { CandleQueryService } from '../../trading/services/candle-query.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { TimeframeType } from '../../trading/schemas/candle.schema'

@Injectable()
export class TradingStrategyRunnerService {
  private readonly logger = new Logger(TradingStrategyRunnerService.name)

  constructor(
    private readonly emaGapStrategy: EmaGapAtrStrategyService,
    private readonly candleQueryService: CandleQueryService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async runStrategy(strategy: Strategy): Promise<void> {
    const configPayload = strategy.config || {}
    const strategyType = configPayload.strategyType || configPayload.type

    if (strategyType !== 'EMA_GAP_ATR') {
      return
    }

    const params = configPayload.parameters || configPayload.config || {}
    const candlesToFetch = Number(configPayload.candlesToFetch || params.candlesToFetch || 200)

    const config = this.buildConfig(strategy, params)
    if (!config) {
      this.logger.warn(`Invalid EMA_GAP_ATR config for strategy ${strategy.id}`)
      return
    }

    const candles = await this.candleQueryService.getRecentCandles(config.symbol, config.timeframe, candlesToFetch)

    if (!candles.length) {
      this.logger.warn(`No candle data for strategy ${strategy.id} (${config.symbol})`)
      return
    }

    const evaluation = this.emaGapStrategy.evaluate(config, candles)

    for (const signal of evaluation.signals) {
      this.logger.log(`Strategy ${strategy.id} signal: ${signal.type} ${signal.data.direction}`)
      this.eventEmitter.emit('strategy.signal', {
        strategyId: strategy.id,
        signal,
        diagnostics: evaluation.diagnostics
      })
    }
  }

  private buildConfig(strategy: Strategy, params: Record<string, any>): EmaGapAtrConfig | null {
    try {
      return {
        id: strategy.id,
        name: strategy.name,
        symbol: strategy.underlyingSymbol,
        timeframe: (params.timeframe || strategy.timeframe) as TimeframeType,
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
            expiryDays: Number(params.expiryDays ?? 7)
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


