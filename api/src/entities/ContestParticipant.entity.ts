import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Contest } from './Contest.entity'
import { User } from './User.entity'
import { Portfolio } from './Portfolio.entity'

@Entity('contest_participants')
@Index(['contest_id', 'user_id'], { unique: true })
export class ContestParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  contest_id!: string

  @Column({ type: 'uuid' })
  user_id!: string

  @CreateDateColumn({ type: 'timestamptz' })
  joined_at!: Date

  @Column({ type: 'boolean', default: false })
  paid_entry_fee!: boolean

  @Column({ type: 'int' })
  starting_balance_cents!: number

  @Column({ type: 'int' })
  current_cash_cents!: number

  @Column({ type: 'int', default: 0 })
  last_value_cents!: number

  @Column({ type: 'int', nullable: true })
  rank!: number | null

  @ManyToOne(() => Contest)
  @JoinColumn({ name: 'contest_id' })
  contest!: Contest

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @OneToOne(() => Portfolio, (p) => p.participant)
  portfolio!: Portfolio
} 