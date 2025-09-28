import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'stock_price_history' })
@Index(['symbol', 'as_of'], { unique: true })
export class StockPriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  symbol!: string;

  @Column('timestamptz')
  as_of!: Date;

  @Column('double precision')
  ltp!: number;

  @Column('bigint', { nullable: true })
  volume!: string | null;
}
