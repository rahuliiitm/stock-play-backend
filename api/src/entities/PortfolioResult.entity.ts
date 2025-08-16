import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('portfolio_results')
@Index(['contest_id', 'participant_id', 'as_of'], { unique: true })
export class PortfolioResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  contest_id!: string

  @Column({ type: 'uuid' })
  participant_id!: string

  @Column({ type: 'timestamptz' })
  as_of!: Date

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_value_amount!: number

  @Column({ type: 'double precision' })
  return_percent!: number

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date
} 