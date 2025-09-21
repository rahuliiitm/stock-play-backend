import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BrokerAccount } from './BrokerAccount.entity'

export type SyncType = 'DAILY_PORTFOLIO' | 'ORDER_HISTORY' | 'REALTIME_UPDATE'
export type SyncStatus = 'STARTED' | 'COMPLETED' | 'FAILED' | 'PARTIAL'

@Entity('sync_batches')
@Index(['broker_account_id'])
@Index(['started_at'])
@Index(['status'])
export class SyncBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  broker_account_id!: string

  @Column({ type: 'varchar', length: 50 })
  sync_type!: SyncType

  @Column({ type: 'varchar', length: 20 })
  status!: SyncStatus

  @CreateDateColumn({ type: 'timestamptz' })
  started_at!: Date

  @Column({ type: 'timestamptz', nullable: true })
  completed_at?: Date

  @Column({ type: 'integer', default: 0 })
  holdings_fetched!: number

  @Column({ type: 'integer', default: 0 })
  positions_fetched!: number

  @Column({ type: 'integer', default: 0 })
  orders_fetched!: number

  @Column({ type: 'integer', default: 0 })
  holdings_updated!: number

  @Column({ type: 'integer', default: 0 })
  positions_updated!: number

  @Column({ type: 'integer', default: 0 })
  orders_created!: number

  @Column({ type: 'integer', default: 0 })
  quantity_changes_detected!: number

  @Column({ type: 'integer', default: 0 })
  errors_count!: number

  @Column({ type: 'jsonb', nullable: true })
  error_details?: any

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any

  @ManyToOne(() => BrokerAccount, (ba) => ba.sync_batches)
  @JoinColumn({ name: 'broker_account_id' })
  broker_account!: BrokerAccount
}
