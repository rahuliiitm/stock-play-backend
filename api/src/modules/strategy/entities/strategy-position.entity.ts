import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Strategy } from './strategy.entity';
import { StrategyOrder } from './strategy-order.entity';

export type PositionSide = 'BUY' | 'SELL';
export type PositionStatus = 'OPEN' | 'CLOSED' | 'PENDING' | 'CANCELLED';

@Entity('strategy_positions')
export class StrategyPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  strategyId: string;

  @Column({ length: 50 })
  symbol: string;

  @Column({ type: 'varchar', length: 4 })
  side: PositionSide;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  entryPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stopLoss: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  target: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pnl: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  realizedPnL: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unrealizedPnL: number;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: PositionStatus;

  @Column({ type: 'timestamp', nullable: true })
  entryTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  exitPrice: number;

  @Column({ type: 'text', nullable: true })
  exitReason: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brokerOrderId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brokerPositionId: string;

  @Column({ type: 'jsonb', nullable: true })
  orderStrategy: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => Strategy, (strategy) => strategy.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'strategy_id' })
  strategy: Strategy;

  @OneToMany(() => StrategyOrder, (order) => order.position, { cascade: true })
  orders?: StrategyOrder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isOpen(): boolean {
    return this.status === 'OPEN';
  }

  isClosed(): boolean {
    return this.status === 'CLOSED';
  }

  getPositionValue(): number {
    return this.entryPrice * this.quantity;
  }

  getCurrentValue(): number {
    return (this.currentPrice || this.entryPrice) * this.quantity;
  }

  getUnrealizedPnL(): number {
    if (!this.currentPrice) return 0;

    const currentValue = this.getCurrentValue();
    const entryValue = this.getPositionValue();

    return this.side === 'BUY'
      ? currentValue - entryValue
      : entryValue - currentValue;
  }

  calculateRiskReward(): { risk: number; reward: number; ratio: number } {
    const entryValue = this.getPositionValue();
    const riskAmount = this.stopLoss
      ? Math.abs(this.entryPrice - this.stopLoss) * this.quantity
      : 0;
    const rewardAmount = this.target
      ? Math.abs(this.target - this.entryPrice) * this.quantity
      : 0;

    return {
      risk: riskAmount,
      reward: rewardAmount,
      ratio: riskAmount > 0 ? rewardAmount / riskAmount : 0,
    };
  }

  updatePnL(): void {
    this.pnl = this.getUnrealizedPnL();
  }

  closePosition(exitPrice: number, reason: string = 'MANUAL_CLOSE'): void {
    this.exitPrice = exitPrice;
    this.exitReason = reason;
    this.status = 'CLOSED';
    this.currentPrice = exitPrice;

    // Calculate final P&L
    this.pnl = this.getUnrealizedPnL();

    this.updatedAt = new Date();
  }

  updateStopLoss(newStopLoss: number): void {
    this.stopLoss = newStopLoss;
    this.updatedAt = new Date();
  }

  updateTarget(newTarget: number): void {
    this.target = newTarget;
    this.updatedAt = new Date();
  }

  updateCurrentPrice(price: number): void {
    this.currentPrice = price;
    this.updatePnL();
    this.updatedAt = new Date();
  }

  // Check if stop loss is hit
  isStopLossHit(): boolean {
    if (!this.stopLoss) return false;

    return this.side === 'BUY'
      ? this.currentPrice <= this.stopLoss
      : this.currentPrice >= this.stopLoss;
  }

  // Check if target is hit
  isTargetHit(): boolean {
    if (!this.target) return false;

    return this.side === 'BUY'
      ? this.currentPrice >= this.target
      : this.currentPrice <= this.target;
  }

  // Get position duration in milliseconds
  getDuration(): number {
    return Date.now() - this.createdAt.getTime();
  }

  // Get position duration in minutes
  getDurationMinutes(): number {
    return Math.floor(this.getDuration() / (1000 * 60));
  }
}
