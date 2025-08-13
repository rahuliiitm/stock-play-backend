import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'contest_results' })
@Index(['contest_id'])
@Index(['user_id'])
export class ContestResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  contest_id!: string

  @Column('uuid')
  user_id!: string

  @Column('jsonb')
  raw_result!: Record<string, any>

  @Column('integer', { default: 0 })
  score!: number

  @Column('integer', { nullable: true })
  rank!: number | null

  @Column('double precision', { nullable: true })
  error_margin!: number | null

  @Column('jsonb', { nullable: true })
  extra!: Record<string, any> | null

  @Column('timestamptz', { default: () => 'now()' })
  computed_at!: Date
} 