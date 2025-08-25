import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Position } from './Position.entity'

@Entity('position_performance')
@Index(['position_id', 'date'], { unique: true })
@Index(['symbol', 'date'])
@Index(['portfolio_id', 'date'])
export class PositionPerformance {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  position_id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'date' })
  date!: Date

  @Column({ type: 'varchar', length: 10 })
  period_type!: 'daily' | 'weekly' | 'monthly'

  // Position Details
  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity!: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  avg_cost_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  market_price_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  market_value_amount!: number

  // Performance Metrics
  @Column({ type: 'decimal', precision: 8, scale: 4 })
  daily_return_percent!: number

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  total_return_percent!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  daily_pnl_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unrealized_pnl_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  realized_pnl_amount!: number

  // Additional Metrics
  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  weight_percent!: number | null // Position weight in portfolio

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  contribution_to_return!: number | null // Contribution to portfolio return

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => Position)
  @JoinColumn({ name: 'position_id' })
  position!: Position
} 