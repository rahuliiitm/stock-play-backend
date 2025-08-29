import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { PortfolioV2 } from './PortfolioV2.entity'

@Entity('portfolio_performance')
@Index(['portfolio_id', 'date'], { unique: true })
@Index(['portfolio_id', 'period_type', 'date'])
export class PortfolioPerformance {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'date' })
  date!: Date

  @Column({ type: 'varchar', length: 10 })
  period_type!: 'daily' | 'weekly' | 'monthly'

  // Portfolio Values
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_value_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  cash_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  positions_value_amount!: number

  // Performance Metrics
  @Column({ type: 'decimal', precision: 8, scale: 4 })
  daily_return_percent!: number

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  cumulative_return_percent!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  daily_pnl_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  cumulative_pnl_amount!: number

  // Risk Metrics
  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  volatility!: number | null

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  sharpe_ratio!: number | null

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  max_drawdown_percent!: number | null

  // Benchmark Comparison
  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  benchmark_return_percent!: number | null

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  alpha!: number | null

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  beta!: number | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: PortfolioV2
} 