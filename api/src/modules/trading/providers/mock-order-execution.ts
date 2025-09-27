import { Injectable, Logger } from '@nestjs/common'
import { 
  OrderExecutionProvider, 
  OrderRequest, 
  OrderResult, 
  OrderStatus, 
  Position, 
  AccountBalance 
} from '../interfaces/order-execution.interface'

@Injectable()
export class MockOrderExecutionProvider implements OrderExecutionProvider {
  private readonly logger = new Logger(MockOrderExecutionProvider.name)
  private orders: Map<string, OrderStatus> = new Map()
  private positions: Map<string, Position> = new Map()
  private balance: AccountBalance = {
    availableBalance: 1000000, // 10 lakh starting balance
    usedMargin: 0,
    totalBalance: 1000000,
    currency: 'INR'
  }
  private orderCounter: number = 0

  async placeBuyOrder(order: OrderRequest): Promise<OrderResult> {
    this.logger.log(`Mock BUY order: ${order.quantity} ${order.symbol} @ ${order.price || 'MARKET'}`)
    
    const orderId = `MOCK_BUY_${++this.orderCounter}`
    const orderStatus: OrderStatus = {
      orderId,
      status: 'COMPLETE',
      filledQuantity: order.quantity,
      pendingQuantity: 0,
      averagePrice: order.price || this.getMockPrice(order.symbol)
    }

    this.orders.set(orderId, orderStatus)
    this.updatePosition(order.symbol, order.quantity, orderStatus.averagePrice || order.price || 0, 'BUY')
    
    return {
      success: true,
      orderId,
      message: 'Mock order executed successfully'
    }
  }

  async placeSellOrder(order: OrderRequest): Promise<OrderResult> {
    this.logger.log(`Mock SELL order: ${order.quantity} ${order.symbol} @ ${order.price || 'MARKET'}`)
    
    const orderId = `MOCK_SELL_${++this.orderCounter}`
    const orderStatus: OrderStatus = {
      orderId,
      status: 'COMPLETE',
      filledQuantity: order.quantity,
      pendingQuantity: 0,
      averagePrice: order.price || this.getMockPrice(order.symbol)
    }

    this.orders.set(orderId, orderStatus)
    this.updatePosition(order.symbol, -order.quantity, orderStatus.averagePrice || order.price || 0, 'SELL')
    
    return {
      success: true,
      orderId,
      message: 'Mock order executed successfully'
    }
  }

  async cancelOrder(orderId: string): Promise<OrderResult> {
    const order = this.orders.get(orderId)
    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      }
    }

    if (order.status === 'COMPLETE') {
      return {
        success: false,
        error: 'Cannot cancel completed order'
      }
    }

    order.status = 'CANCELLED'
    this.orders.set(orderId, order)
    
    this.logger.log(`Mock order cancelled: ${orderId}`)
    return {
      success: true,
      message: 'Mock order cancelled successfully'
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    const order = this.orders.get(orderId)
    if (!order) {
      throw new Error('Order not found')
    }
    return order
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values())
  }

  async getBalance(): Promise<AccountBalance> {
    return { ...this.balance }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Get mock price for a symbol (for backtesting)
   */
  private getMockPrice(symbol: string): number {
    // Simple mock price based on symbol
    const basePrice = symbol.includes('NIFTY') ? 24000 : 100
    return basePrice + Math.random() * 100
  }

  /**
   * Update position after order execution
   */
  private updatePosition(symbol: string, quantity: number, price: number, side: 'BUY' | 'SELL'): void {
    const existingPosition = this.positions.get(symbol)
    
    if (existingPosition) {
      const newQuantity = existingPosition.quantity + quantity
      if (newQuantity === 0) {
        this.positions.delete(symbol)
      } else {
        const newAveragePrice = (existingPosition.averagePrice * existingPosition.quantity + price * quantity) / newQuantity
        this.positions.set(symbol, {
          ...existingPosition,
          quantity: newQuantity,
          averagePrice: newAveragePrice,
          currentPrice: this.getMockPrice(symbol),
          pnl: (this.getMockPrice(symbol) - newAveragePrice) * newQuantity,
          pnlPercentage: ((this.getMockPrice(symbol) - newAveragePrice) / newAveragePrice) * 100
        })
      }
    } else if (quantity > 0) {
      this.positions.set(symbol, {
        symbol,
        quantity,
        averagePrice: price,
        currentPrice: this.getMockPrice(symbol),
        pnl: (this.getMockPrice(symbol) - price) * quantity,
        pnlPercentage: ((this.getMockPrice(symbol) - price) / price) * 100
      })
    }

    // Update balance
    const cost = quantity * price
    this.balance.availableBalance -= cost
    this.balance.usedMargin += cost
  }

  /**
   * Reset mock state for testing
   */
  reset(): void {
    this.orders.clear()
    this.positions.clear()
    this.balance = {
      availableBalance: 1000000,
      usedMargin: 0,
      totalBalance: 1000000,
      currency: 'INR'
    }
    this.orderCounter = 0
  }

  /**
   * Get all orders for testing
   */
  getAllOrders(): OrderStatus[] {
    return Array.from(this.orders.values())
  }

  /**
   * Set mock price for a symbol
   */
  setMockPrice(symbol: string, price: number): void {
    // This would be used in backtesting to set specific prices
    this.logger.debug(`Setting mock price for ${symbol}: ${price}`)
  }
}
