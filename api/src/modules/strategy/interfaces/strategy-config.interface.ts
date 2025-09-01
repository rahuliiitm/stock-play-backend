export interface StrategyConfig {
  id: string
  name: string
  description: string
  underlyingSymbol: string
  timeframe: string
  maxConcurrentPositions: number
  riskManagement: {
    maxLossPerTrade: number
    maxDailyLoss: number
    maxDrawdown: number
    positionSizePercent: number
  }
  entryConditions: EntryCondition[]
  exitConditions: ExitCondition[]
  orderConfig: OrderConfig
  indicators: IndicatorConfig[]
  timeFilters?: TimeFilter[]
}

export interface EntryCondition {
  id: string
  name: string
  type: 'SEQUENTIAL' | 'PARALLEL' | 'CUSTOM'
  conditions: StrategyCondition[]
  confirmation?: {
    timeframe: string
    condition: StrategyCondition
  }
}

export interface ExitCondition {
  id: string
  name: string
  type: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIME_BASED' | 'SIGNAL_BASED'
  condition: StrategyCondition
  priority: number // Lower number = higher priority
}

export interface StrategyCondition {
  type: 'INDICATOR_COMPARISON' | 'PRICE_CONDITION' | 'VOLUME_CONDITION' | 'TIME_CONDITION' | 'CUSTOM_LOGIC'
  operator: 'GT' | 'LT' | 'EQ' | 'NEQ' | 'GTE' | 'LTE' | 'AND' | 'OR'
  leftOperand: string
  rightOperand: any
  timeframe?: string
}

export interface IndicatorConfig {
  name: string
  type: string
  parameters: Record<string, any>
  timeframe: string
}

export interface OrderConfig {
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL_M'
  quantity: number
  productType: 'MIS' | 'CNC' | 'NRML'
  spreadConfig?: SpreadConfig
}

export interface SpreadConfig {
  type: 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD'
  sellStrikeOffset: number // Points from spot
  buyStrikeOffset: number // Points from sell strike
  expiryType: 'weekly' | 'monthly'
}

export interface TimeFilter {
  days: number[] // 0 = Sunday, 6 = Saturday
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  excludeHolidays: boolean
}

// NIFTY Option Selling Strategy Configuration
export const NIFTY_OPTION_SELLING_CONFIG: StrategyConfig = {
  id: 'nifty-weekly-option-selling',
  name: 'NIFTY Weekly Option Selling',
  description: 'Weekly option selling strategy using Supertrend and EMA',
  underlyingSymbol: 'NIFTY',
  timeframe: '1H',
  maxConcurrentPositions: 1,
  riskManagement: {
    maxLossPerTrade: 2000,
    maxDailyLoss: 10000,
    maxDrawdown: 5000,
    positionSizePercent: 5
  },
  indicators: [
    {
      name: 'supertrend',
      type: 'SUPER_TREND',
      parameters: { period: 10, multiplier: 3 },
      timeframe: '1H'
    },
    {
      name: 'ema20',
      type: 'EMA',
      parameters: { period: 20 },
      timeframe: '1H'
    }
  ],
  entryConditions: [
    {
      id: 'bullish-entry',
      name: 'Bull Put Spread Entry',
      type: 'SEQUENTIAL',
      conditions: [
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'EQ',
          leftOperand: 'supertrend_direction',
          rightOperand: 'bullish'
        },
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'GT',
          leftOperand: 'close',
          rightOperand: 'ema20'
        }
      ],
      confirmation: {
        timeframe: '1H',
        condition: {
          type: 'PRICE_CONDITION',
          operator: 'GT',
          leftOperand: 'close',
          rightOperand: 'entry_candle_high'
        }
      }
    },
    {
      id: 'bearish-entry',
      name: 'Bear Call Spread Entry',
      type: 'SEQUENTIAL',
      conditions: [
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'EQ',
          leftOperand: 'supertrend_direction',
          rightOperand: 'bearish'
        },
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'LT',
          leftOperand: 'close',
          rightOperand: 'ema20'
        }
      ],
      confirmation: {
        timeframe: '1H',
        condition: {
          type: 'PRICE_CONDITION',
          operator: 'LT',
          leftOperand: 'close',
          rightOperand: 'entry_candle_low'
        }
      }
    }
  ],
  exitConditions: [
    {
      id: 'supertrend-flip',
      name: 'Supertrend Direction Change',
      type: 'SIGNAL_BASED',
      condition: {
        type: 'INDICATOR_COMPARISON',
        operator: 'NEQ',
        leftOperand: 'supertrend_direction',
        rightOperand: 'entry_direction'
      },
      priority: 1
    },
    {
      id: 'stop-loss',
      name: 'Stop Loss (1.5x Net Credit)',
      type: 'STOP_LOSS',
      condition: {
        type: 'CUSTOM_LOGIC',
        operator: 'LT',
        leftOperand: 'current_pnl',
        rightOperand: 'net_credit * -1.5'
      },
      priority: 2
    },
    {
      id: 'take-profit',
      name: 'Take Profit (75% of Max Profit)',
      type: 'TAKE_PROFIT',
      condition: {
        type: 'CUSTOM_LOGIC',
        operator: 'GT',
        leftOperand: 'current_pnl',
        rightOperand: 'max_profit * 0.75'
      },
      priority: 3
    },
    {
      id: 'gamma-risk',
      name: 'Gamma Risk Exit (Wednesday)',
      type: 'TIME_BASED',
      condition: {
        type: 'TIME_CONDITION',
        operator: 'EQ',
        leftOperand: 'day_of_week',
        rightOperand: 3
      },
      priority: 4
    },
    {
      id: 'expiry-exit',
      name: 'Near Expiry Exit',
      type: 'TIME_BASED',
      condition: {
        type: 'TIME_CONDITION',
        operator: 'LTE',
        leftOperand: 'days_to_expiry',
        rightOperand: 1
      },
      priority: 5
    }
  ],
  orderConfig: {
    orderType: 'MARKET',
    quantity: 50,
    productType: 'MIS',
    spreadConfig: {
      type: 'BULL_PUT_SPREAD',
      sellStrikeOffset: 0, // ATM
      buyStrikeOffset: 200, // 200 points OTM
      expiryType: 'weekly'
    }
  },
  timeFilters: [
    {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '09:15',
      endTime: '15:30',
      excludeHolidays: true
    }
  ]
}
