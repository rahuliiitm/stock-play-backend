import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Strategy } from './strategy.entity';
import { StrategyPosition } from './strategy-position.entity';

export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'SL'
  | 'SL-M'
  | 'BO'
  | 'CO'
  | 'ICEBERG'
  | 'OCO';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus =
  | 'PENDING'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'PARTIAL_FILL';
export type ProductType = 'CNC' | 'MIS' | 'NRML';
export type OrderValidity = 'DAY' | 'IOC' | 'GTD';

@Entity('strategy_orders')
export class StrategyOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  strategyId: string;

  @Column({ type: 'uuid', nullable: true })
  positionId: string;

  @Column({ type: 'varchar', length: 20 })
  orderType: OrderType;

  @Column({ type: 'varchar', length: 4 })
  side: OrderSide;

  @Column({ length: 50 })
  symbol: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  triggerPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  disclosedQuantity: number;

  @Column({ type: 'varchar', length: 10, default: 'MIS' })
  productType: ProductType;

  @Column({ type: 'varchar', length: 10, default: 'DAY' })
  orderValidity: OrderValidity;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  brokerOrderId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brokerOrderStatus: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  executionPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  executedQuantity: number;

  @Column({ type: 'jsonb', nullable: true })
  orderParams: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => Strategy, (strategy) => strategy.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'strategy_id' })
  strategy: Strategy;

  @ManyToOne(() => StrategyPosition, (position) => position.orders, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'position_id' })
  position?: StrategyPosition;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isPending(): boolean {
    return this.status === 'PENDING';
  }

  isExecuted(): boolean {
    return this.status === 'EXECUTED';
  }

  isRejected(): boolean {
    return this.status === 'REJECTED';
  }

  isCancelled(): boolean {
    return this.status === 'CANCELLED';
  }

  getRemainingQuantity(): number {
    return this.quantity - this.executedQuantity;
  }

  isFullyExecuted(): boolean {
    return this.executedQuantity >= this.quantity;
  }

  isPartiallyExecuted(): boolean {
    return this.executedQuantity > 0 && this.executedQuantity < this.quantity;
  }

  getExecutionRate(): number {
    return this.quantity > 0
      ? (this.executedQuantity / this.quantity) * 100
      : 0;
  }

  canRetry(): boolean {
    return this.retryCount < 3 && !this.isExecuted();
  }

  markAsExecuted(executionPrice: number, executedQty: number): void {
    this.executionPrice = executionPrice;
    this.executedQuantity = executedQty;
    this.status = this.isFullyExecuted() ? 'EXECUTED' : 'PARTIAL_FILL';
    this.brokerOrderStatus = 'EXECUTED';
    this.updatedAt = new Date();
  }

  markAsRejected(errorMessage: string): void {
    this.status = 'REJECTED';
    this.errorMessage = errorMessage;
    this.brokerOrderStatus = 'REJECTED';
    this.updatedAt = new Date();
  }

  markAsCancelled(reason?: string): void {
    this.status = 'CANCELLED';
    if (reason) {
      this.errorMessage = reason;
    }
    this.updatedAt = new Date();
  }

  incrementRetry(errorMessage?: string): boolean {
    if (!this.canRetry()) {
      return false;
    }

    this.retryCount++;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
    this.updatedAt = new Date();
    return true;
  }

  // Get order value
  getOrderValue(): number {
    const price = this.executionPrice || this.price || 0;
    return price * this.quantity;
  }

  // Get executed value
  getExecutedValue(): number {
    if (!this.executionPrice) return 0;
    return this.executionPrice * this.executedQuantity;
  }

  // Calculate slippage (difference between expected and actual execution price)
  getSlippage(): number {
    if (!this.executionPrice || !this.price) return 0;
    return ((this.executionPrice - this.price) / this.price) * 100;
  }

  // Get order duration in milliseconds
  getDuration(): number {
    return Date.now() - this.createdAt.getTime();
  }

  // Get order duration in minutes
  getDurationMinutes(): number {
    return Math.floor(this.getDuration() / (1000 * 60));
  }

  // Check if order is expired based on validity
  isExpired(): boolean {
    if (this.orderValidity === 'DAY') {
      const orderDate = this.createdAt.toDateString();
      const today = new Date().toDateString();
      return orderDate !== today;
    }

    // For GTD orders, check expiry date
    if (this.orderValidity === 'GTD' && this.metadata?.expiryDate) {
      return new Date() > new Date(this.metadata.expiryDate);
    }

    return false;
  }

  // Validate order parameters
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validations
    if (!this.symbol) errors.push('Symbol is required');
    if (!this.quantity || this.quantity <= 0)
      errors.push('Valid quantity is required');
    if (!this.side) errors.push('Order side is required');

    // Order type specific validations
    if (this.orderType === 'LIMIT' && !this.price) {
      errors.push('Limit price is required for LIMIT orders');
    }

    if (
      (this.orderType === 'SL' || this.orderType === 'SL-M') &&
      !this.triggerPrice
    ) {
      errors.push('Trigger price is required for SL orders');
    }

    if (
      this.orderType === 'ICEBERG' &&
      (!this.disclosedQuantity || this.disclosedQuantity >= this.quantity)
    ) {
      errors.push('Valid disclosed quantity is required for ICEBERG orders');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Convert to broker API format
  toBrokerFormat(): Record<string, any> {
    const brokerOrder: any = {
      symbol: this.symbol,
      side: this.side,
      quantity: this.quantity,
      orderType: this.orderType,
      productType: this.productType,
      orderValidity: this.orderValidity,
    };

    if (this.price !== undefined && this.price !== null)
      brokerOrder.price = this.price;
    if (this.triggerPrice !== undefined && this.triggerPrice !== null)
      brokerOrder.triggerPrice = this.triggerPrice;
    if (this.disclosedQuantity !== undefined && this.disclosedQuantity !== null)
      brokerOrder.disclosedQuantity = this.disclosedQuantity;

    // Add any additional broker-specific parameters
    if (this.orderParams) {
      Object.assign(brokerOrder, this.orderParams);
    }

    return brokerOrder;
  }
}
