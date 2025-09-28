import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('indicator_values')
@Index(['symbol', 'indicator_name', 'calculated_at'])
@Index(['symbol', 'calculated_at'])
export class IndicatorValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 50 })
  indicator_name: string;

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  value: number;

  @Column({ type: 'jsonb', nullable: true })
  additional_data: Record<string, any>;

  @Column({ type: 'timestamp' })
  calculated_at: Date;

  @Column({ type: 'varchar', length: 20, default: '1d' })
  interval: string;

  @Column({ type: 'int', default: 14 })
  lookback_period: number;

  @Column({ type: 'jsonb' })
  parameters_used: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;
}
