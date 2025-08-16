import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './User.entity'
import { ContestParticipant } from './ContestParticipant.entity'

@Entity('contests')
export class Contest {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  slug!: string

  @Column({ type: 'varchar', length: 140 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'varchar', length: 16, default: 'public' })
  visibility!: 'public' | 'private'

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  entry_fee_amount!: number

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  initial_balance_amount!: number

  @Column({ type: 'int', nullable: true })
  max_participants!: number | null

  @Column({ type: 'timestamptz' })
  starts_at!: Date

  @Column({ type: 'timestamptz' })
  ends_at!: Date

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled'

  @Column({ type: 'uuid' })
  created_by_user_id!: string

  @Column({ type: 'jsonb', nullable: true })
  allowed_symbols!: string[] | null

  @Column({ type: 'jsonb', nullable: true })
  trading_constraints!: Record<string, any> | null

  @Column({ type: 'text', nullable: true })
  contest_type!: string | null

  @Column({ type: 'jsonb', nullable: true })
  rule_config!: Record<string, any> | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date

  @OneToMany(() => ContestParticipant, (p) => p.contest)
  participants!: ContestParticipant[]
} 