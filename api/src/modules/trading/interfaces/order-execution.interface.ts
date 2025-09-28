/**
 * Abstract interface for order execution
 * Supports both mock and real broker integration
 */
export interface OrderExecutionProvider {
  /**
   * Place a buy order
   */
  placeBuyOrder(order: OrderRequest): Promise<OrderResult>;

  /**
   * Place a sell order
   */
  placeSellOrder(order: OrderRequest): Promise<OrderResult>;

  /**
   * Cancel an existing order
   */
  cancelOrder(orderId: string): Promise<OrderResult>;

  /**
   * Get order status
   */
  getOrderStatus(orderId: string): Promise<OrderStatus>;

  /**
   * Get account positions
   */
  getPositions(): Promise<Position[]>;

  /**
   * Get account balance
   */
  getBalance(): Promise<AccountBalance>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

export interface OrderRequest {
  symbol: string;
  quantity: number;
  price?: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS';
  product: 'MIS' | 'CNC' | 'NRML';
  validity: 'DAY' | 'IOC' | 'GTD';
  disclosedQuantity?: number;
  triggerPrice?: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  message?: string;
}

export interface OrderStatus {
  orderId: string;
  status: 'PENDING' | 'COMPLETE' | 'CANCELLED' | 'REJECTED';
  filledQuantity: number;
  pendingQuantity: number;
  averagePrice?: number;
  message?: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
}

export interface AccountBalance {
  availableBalance: number;
  usedMargin: number;
  totalBalance: number;
  currency: string;
}
