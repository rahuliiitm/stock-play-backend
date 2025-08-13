import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Portfolio } from './Portfolio.entity'
import { Contest } from './Contest.entity'
import { User } from './User.entity'

@Entity('trades')
@Index(['portfolio_id'])
@Index(['contest_id'])
@Index(['symbol'])
@Index(['executed_at'])
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'uuid' })
  contest_id!: string

  @Column({ type: 'uuid' })
  user_id!: string

  @Column({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'varchar', length: 4 })
  side!: 'BUY' | 'SELL'

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity!: string

  @Column({ type: 'int' })
  price_cents!: number

  @Column({ type: 'int' })
  notional_cents!: number

  @Column({ type: 'timestamptz' })
  executed_at!: Date

  @Column({ type: 'varchar', length: 32 })
  quote_source!: string

  @Column({ type: 'jsonb', nullable: true })
  provider_payload!: Record<string, any> | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: Portfolio

  @ManyToOne(() => Contest)
  @JoinColumn({ name: 'contest_id' })
  contest!: Contest

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User
} 