import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'participant_predictions' })
@Index(['contest_id'])
@Index(['user_id'])
export class ParticipantPrediction {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  contest_id!: string

  @Column('uuid')
  user_id!: string

  @Column('text')
  symbol!: string

  @Column('jsonb')
  prediction!: Record<string, any>

  @Column('timestamptz', { default: () => 'now()' })
  submitted_at!: Date
} 