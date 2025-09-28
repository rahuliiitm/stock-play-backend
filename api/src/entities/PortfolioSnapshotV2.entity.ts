import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioV2 } from './PortfolioV2.entity';

@Entity('portfolio_snapshots_v2')
@Index(['portfolioId', 'date'], { unique: true })
export class PortfolioSnapshotV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  portfolioId!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  market_value!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  invested!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  pnl!: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  return_percent!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolioId' })
  portfolio!: PortfolioV2;
}
