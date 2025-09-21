import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BrokerAccount } from './BrokerAccount.entity'

@Entity('real_holdings')
@Index(['broker_account_id', 'symbol', 'exchange'], { unique: true })
export class RealHolding {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  broker_account_id!: string

  @Column({ type: 'varchar', length: 20 })
  symbol!: string

  @Column({ type: 'varchar', length: 10, default: 'NSE' })
  exchange!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  isin?: string

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  average_price!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  current_price?: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  current_value?: number

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  pledge_quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  demat_locked_quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  groww_locked_quantity!: number

  @Column({ type: 'timestamptz', default: () => 'now()' })
  last_updated_at!: Date

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => BrokerAccount, (ba) => ba.holdings)
  @JoinColumn({ name: 'broker_account_id' })
  broker_account!: BrokerAccount
}
