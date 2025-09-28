import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('market_movers')
@Index(['date', 'period_type', 'mover_type'])
@Index(['symbol', 'date'])
export class MarketMovers {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  symbol!: string;

  @Column({ type: 'varchar', length: 100 })
  company_name!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 10 })
  period_type!: 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'varchar', length: 10 })
  mover_type!: 'gainer' | 'loser';

  // Price Data
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  current_price_amount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  previous_price_amount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price_change_amount!: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  price_change_percent!: number;

  // Volume Data
  @Column({ type: 'bigint', nullable: true })
  volume!: number | null;

  @Column({ type: 'bigint', nullable: true })
  avg_volume!: number | null;

  // Portfolio Impact
  @Column({ type: 'integer' })
  portfolios_holding_count!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_market_value_amount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  avg_portfolio_impact_amount!: number;

  // Ranking
  @Column({ type: 'integer' })
  rank!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
