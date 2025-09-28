import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BrokerAccount } from './BrokerAccount.entity';

@Entity('portfolio_snapshots')
@Index(['broker_account_id', 'snapshot_date'], { unique: true })
@Index(['snapshot_date'])
@Index(['broker_account_id'])
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  broker_account_id!: string;

  @Column({ type: 'date' })
  snapshot_date!: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_holdings_value!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_positions_value!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_portfolio_value!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  cash_balance?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  margin_used?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  margin_available?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  day_change?: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  day_change_percent?: number;

  @Column({ type: 'integer' })
  holdings_count!: number;

  @Column({ type: 'integer' })
  positions_count!: number;

  @Column({ type: 'integer' })
  orders_count!: number;

  @Column({ type: 'integer' })
  trades_count!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => BrokerAccount, (ba) => ba.portfolio_snapshots)
  @JoinColumn({ name: 'broker_account_id' })
  broker_account!: BrokerAccount;
}
