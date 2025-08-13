import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('leaderboard_snapshots')
export class LeaderboardSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  contest_id!: string

  @Column({ type: 'timestamptz' })
  as_of!: Date

  @Column({ type: 'jsonb' })
  rankings!: any

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date
} 