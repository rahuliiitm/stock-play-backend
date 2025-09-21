import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { OrderHistory } from './OrderHistory.entity'

export type ChangeType = 'QUANTITY_ADDED' | 'QUANTITY_REMOVED' | 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'STATUS_CHANGED'

@Entity('order_quantity_changes')
@Index(['symbol'])
@Index(['detected_at'])
@Index(['sync_batch_id'])
export class OrderQuantityChange {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  order_history_id!: string

  @Column({ type: 'varchar', length: 20 })
  symbol!: string

  @Column({ type: 'varchar', length: 20 })
  change_type!: ChangeType

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  previous_quantity?: number

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  new_quantity?: number

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity_delta!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  price_at_change?: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  change_reason?: string

  @CreateDateColumn({ type: 'timestamptz' })
  detected_at!: Date

  @Column({ type: 'uuid', nullable: true })
  sync_batch_id?: string

  @ManyToOne(() => OrderHistory, (o) => o.quantity_changes)
  @JoinColumn({ name: 'order_history_id' })
  order_history!: OrderHistory
}
