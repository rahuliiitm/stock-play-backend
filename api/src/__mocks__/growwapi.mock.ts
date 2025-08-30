// Mock for growwapi to avoid ES module issues in E2E tests

export enum Exchange {
  NSE = 'NSE',
  BSE = 'BSE'
}

export enum Segment {
  CASH = 'CASH',
  FNO = 'FNO'
}

export enum Product {
  CNC = 'CNC',
  MIS = 'MIS',
  NRML = 'NRML'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_MARKET = 'STOP_LOSS_MARKET'
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum Validity {
  DAY = 'DAY',
  IOC = 'IOC',
  GTD = 'GTD'
}

// Mock response types
export interface GetQuoteResponse {
  lastPrice: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  ohlc?: {
    open: number
    high: number
    low: number
    close: number
  }
}

export interface CandleResponse {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface HoldingsResponse {
  holdings: Array<{
    isin: string
    trading_symbol: string
    quantity: number
    average_price: number
    pledge_quantity: number
    demat_locked_quantity: number
    groww_locked_quantity: number
    repledge_quantity: number
    t1_quantity: number
    demat_free_quantity: number
    corporate_action_additional_quantity: number
    active_demat_transfer_quantity: number
  }>
}

export interface PositionsResponse {
  positions: Array<{
    trading_symbol: string
    quantity: number
    average_price: number
    pnl: number
  }>
}

export interface OrdersResponse {
  orders: Array<{
    order_id: string
    trading_symbol: string
    quantity: number
    price: number
    status: string
  }>
}

export interface MarginsResponse {
  available_margin: number
  used_margin: number
  total_margin: number
}

// Mock GrowwAPI class
export class GrowwAPI {
  public liveData = {
    getQuote: jest.fn().mockResolvedValue({
      lastPrice: 2500.50,
      change: 25.50,
      changePercent: 1.03,
      open: 2475.00,
      high: 2520.00,
      low: 2470.00,
      close: 2500.50,
      volume: 1000000,
      ohlc: {
        open: 2475.00,
        high: 2520.00,
        low: 2470.00,
        close: 2500.50
      }
    } as GetQuoteResponse)
  }

  public historicData = {
    get: jest.fn().mockResolvedValue({
      candles: [
        {
          time: Date.now() - 86400000, // 1 day ago
          open: 2475.00,
          high: 2520.00,
          low: 2470.00,
          close: 2500.50,
          volume: 1000000
        }
      ]
    })
  }

  public holdings = {
    list: jest.fn().mockResolvedValue({
      holdings: [
        {
          isin: 'INE002A01018',
          trading_symbol: 'RELIANCE',
          quantity: 100,
          average_price: 2400.00,
          pledge_quantity: 0,
          demat_locked_quantity: 0,
          groww_locked_quantity: 0,
          repledge_quantity: 0,
          t1_quantity: 0,
          demat_free_quantity: 100,
          corporate_action_additional_quantity: 0,
          active_demat_transfer_quantity: 0
        }
      ]
    } as HoldingsResponse)
  }

  public position = {
    user: jest.fn().mockResolvedValue({
      positions: [
        {
          trading_symbol: 'RELIANCE',
          quantity: 100,
          average_price: 2400.00,
          pnl: 10050.00
        }
      ]
    } as PositionsResponse)
  }

  public positions = {
    user: jest.fn().mockResolvedValue({
      positions: [
        {
          trading_symbol: 'RELIANCE',
          quantity: 100,
          average_price: 2400.00,
          pnl: 10050.00
        }
      ]
    } as PositionsResponse)
  }

  public orders = {
    getOrders: jest.fn().mockResolvedValue({
      orders: [
        {
          order_id: '12345',
          trading_symbol: 'RELIANCE',
          quantity: 100,
          price: 2400.00,
          status: 'COMPLETE'
        }
      ]
    } as OrdersResponse),
    create: jest.fn().mockResolvedValue({
      orderId: '12345',
      status: 'SUCCESS'
    }),
    modify: jest.fn().mockResolvedValue({
      orderId: '12345',
      status: 'SUCCESS'
    }),
    cancel: jest.fn().mockResolvedValue({
      orderId: '12345',
      status: 'CANCELLED'
    }),
    status: jest.fn().mockResolvedValue({
      orderId: '12345',
      status: 'COMPLETE'
    })
  }

  public margins = {
    details: jest.fn().mockResolvedValue({
      available_margin: 100000.00,
      used_margin: 50000.00,
      total_margin: 150000.00
    } as MarginsResponse),
    requiredForOrder: jest.fn().mockResolvedValue({
      margin_required: 50000.00
    })
  }

  public instructions = {
    getFilteredInstructions: jest.fn().mockResolvedValue([
      {
        trading_symbol: 'RELIANCE',
        exchange: 'NSE',
        isin: 'INE002A01018',
        name: 'Reliance Industries Limited'
      }
    ])
  }

  public liveFeed = {
    connect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }
}

// Export default for compatibility
export default GrowwAPI
