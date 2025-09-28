import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface IndicatorParams {
  [key: string]: number | string;
}

@Entity('indicator_configs')
@Index(['symbol', 'indicator_name'], { unique: true })
export class IndicatorConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 50 })
  indicator_name: string;

  @Column({ type: 'jsonb' })
  parameters: IndicatorParams;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 14 })
  lookback_period: number;

  @Column({ type: 'varchar', length: 20, default: '1d' })
  interval: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
