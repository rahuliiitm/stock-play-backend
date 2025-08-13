import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'market_results' })
@Index(['contest_id'])
@Index(['symbol'])
export class MarketResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  contest_id!: string

  @Column('text')
  symbol!: string

  @Column('jsonb')
  data!: Record<string, any>

  @Column('timestamptz')
  period_start!: Date

  @Column('timestamptz')
  period_end!: Date

  @Column('timestamptz', { default: () => 'now()' })
  captured_at!: Date
} 