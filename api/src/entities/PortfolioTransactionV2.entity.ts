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

export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';

@Entity('portfolio_transactions_v2')
@Index(['portfolioId', 'created_at'])
export class PortfolioTransactionV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  portfolioId!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  symbol!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  exchange!: 'NSE' | 'BSE' | null;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  quantity_delta!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  price!: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  fees!: number | null;

  @Column({ type: 'varchar', length: 16 })
  type!: TransactionType;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolioId' })
  portfolio!: PortfolioV2;
}
