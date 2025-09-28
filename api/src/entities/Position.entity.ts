import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioV2 } from './PortfolioV2.entity';

@Entity('positions')
@Index(['portfolio_id', 'symbol'], { unique: true })
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  portfolio_id!: string;

  @Column({ type: 'varchar', length: 16 })
  symbol!: string;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity!: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  avg_cost_amount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  current_value_amount!: number;

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: PortfolioV2;
}
