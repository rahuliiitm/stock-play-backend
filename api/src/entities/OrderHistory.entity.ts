import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BrokerAccount } from './BrokerAccount.entity';
import { OrderQuantityChange } from './OrderQuantityChange.entity';

@Entity('order_history')
@Index(['broker_account_id', 'symbol'])
@Index(['groww_order_id'], { unique: true })
@Index(['created_at'])
@Index(['sync_batch_id'])
export class OrderHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  broker_account_id!: string;

  @Column({ type: 'varchar', length: 100 })
  groww_order_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  order_reference_id?: string;

  @Column({ type: 'varchar', length: 20 })
  symbol!: string;

  @Column({ type: 'varchar', length: 10, default: 'NSE' })
  exchange!: string;

  @Column({ type: 'varchar', length: 10, default: 'CASH' })
  segment!: string;

  @Column({ type: 'varchar', length: 10 })
  product!: string;

  @Column({ type: 'varchar', length: 20 })
  order_type!: string;

  @Column({ type: 'varchar', length: 10 })
  transaction_type!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  price?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  trigger_price?: number;

  @Column({ type: 'varchar', length: 10 })
  validity!: string;

  @Column({ type: 'varchar', length: 20 })
  order_status!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  filled_quantity!: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  remaining_quantity!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  average_fill_price?: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  deliverable_quantity!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  amo_status?: string;

  @Column({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exchange_time?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  trade_date?: Date;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  detected_at!: Date;

  @Column({ type: 'uuid', nullable: true })
  sync_batch_id?: string;

  @ManyToOne(() => BrokerAccount, (ba) => ba.order_history)
  @JoinColumn({ name: 'broker_account_id' })
  broker_account!: BrokerAccount;

  @OneToMany(() => OrderQuantityChange, (c) => c.order_history)
  quantity_changes!: OrderQuantityChange[];
}
