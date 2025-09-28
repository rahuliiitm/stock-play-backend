import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Strategy } from './strategy.entity';

export type ProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

@Entity('missed_data_tracking')
export class MissedDataTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  strategyId: string;

  @Column({ length: 50 })
  symbol: string;

  @Column({ type: 'varchar', length: 10 })
  timeframe: string;

  @Column({ type: 'timestamp' })
  missedStartTime: Date;

  @Column({ type: 'timestamp' })
  missedEndTime: Date;

  @Column({ type: 'integer', default: 0 })
  candlesCount: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: ProcessingStatus;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  processingResult: {
    processedCandles: number;
    failedCandles: number;
    signalsGenerated: number;
    ordersPlaced: number;
    errors: string[];
  };

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  // Relationship
  @ManyToOne(() => Strategy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategy_id' })
  strategy: Strategy;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  static create(params: {
    strategyId: string;
    symbol: string;
    timeframe: string;
    missedStartTime: Date;
    missedEndTime: Date;
    candlesCount?: number;
  }): MissedDataTracking {
    const tracking = new MissedDataTracking();
    tracking.strategyId = params.strategyId;
    tracking.symbol = params.symbol;
    tracking.timeframe = params.timeframe;
    tracking.missedStartTime = params.missedStartTime;
    tracking.missedEndTime = params.missedEndTime;
    tracking.candlesCount = params.candlesCount || 0;
    return tracking;
  }

  isPending(): boolean {
    return this.status === 'PENDING';
  }

  isProcessing(): boolean {
    return this.status === 'PROCESSING';
  }

  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  isFailed(): boolean {
    return this.status === 'FAILED';
  }

  canRetry(): boolean {
    return this.retryCount < 3 && !this.isCompleted();
  }

  getDuration(): number {
    return this.missedEndTime.getTime() - this.missedStartTime.getTime();
  }

  getDurationMinutes(): number {
    return Math.floor(this.getDuration() / (1000 * 60));
  }

  getProcessingDuration(): number | null {
    if (!this.processedAt) return null;
    return this.processedAt.getTime() - this.createdAt.getTime();
  }

  markAsProcessing(): void {
    this.status = 'PROCESSING';
  }

  markAsCompleted(result: any): void {
    this.status = 'COMPLETED';
    this.processedAt = new Date();
    this.processingResult = result;
  }

  markAsFailed(errorMessage: string): void {
    this.status = 'FAILED';
    this.errorMessage = errorMessage;
    this.processedAt = new Date();
  }

  incrementRetry(): boolean {
    if (!this.canRetry()) {
      return false;
    }
    this.retryCount++;
    return true;
  }

  // Calculate success rate
  getSuccessRate(): number {
    if (!this.processingResult) return 0;

    const { processedCandles, failedCandles } = this.processingResult;
    const total = processedCandles + failedCandles;

    return total > 0 ? (processedCandles / total) * 100 : 0;
  }

  // Get age in minutes
  getAgeMinutes(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
  }

  // Check if tracking is stale (not processed within reasonable time)
  isStale(maxAgeMinutes: number = 60): boolean {
    return this.getAgeMinutes() > maxAgeMinutes && !this.isCompleted();
  }

  // Format for display
  toDisplayString(): string {
    const status =
      this.status === 'COMPLETED'
        ? '✅'
        : this.status === 'FAILED'
          ? '❌'
          : this.status === 'PROCESSING'
            ? '🔄'
            : '⏳';

    const duration = this.getDurationMinutes();
    const age = this.getAgeMinutes();

    return `${status} ${this.symbol} (${this.timeframe}) - ${this.candlesCount} candles, ${duration}min gap, ${age}min old`;
  }
}
