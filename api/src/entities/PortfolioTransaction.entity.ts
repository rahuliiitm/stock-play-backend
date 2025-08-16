import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Portfolio } from './Portfolio.entity'

@Entity('portfolio_transactions')
@Index(['portfolio_id', 'created_at'])
export class PortfolioTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity_delta!: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price_amount!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  value_amount!: number

  @Column({ type: 'varchar', length: 16 })
  type!: 'BUY' | 'SELL' | 'REBALANCE'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: Portfolio
} 