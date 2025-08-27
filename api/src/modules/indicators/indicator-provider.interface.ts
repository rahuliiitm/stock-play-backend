import { Candle } from '../../lib/market-data-sdk/models'

export interface IndicatorResult {
  value: number
  additionalData?: Record<string, any>
  timestamp: Date
}

export interface IndicatorProvider {
  name: string
  description: string
  requiredParameters: string[]
  optionalParameters?: string[]
  minDataPoints: number
  
  calculate(
    candles: Candle[],
    parameters: Record<string, any>
  ): IndicatorResult | null
}

export interface IndicatorProviderRegistry {
  register(provider: IndicatorProvider): void
  get(name: string): IndicatorProvider | undefined
  getAll(): IndicatorProvider[]
  getNames(): string[]
}

// Technical Indicators library types
export interface TechnicalIndicatorInput {
  open?: number[]
  high?: number[]
  low?: number[]
  close: number[]
  volume?: number[]
}

export interface TechnicalIndicatorOutput {
  [key: string]: number[]
}
