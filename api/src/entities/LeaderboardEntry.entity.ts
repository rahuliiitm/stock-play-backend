import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { PortfolioV2 } from './PortfolioV2.entity'

export type LeaderboardWindow = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL'

@Entity('leaderboard_entries')
@Index(['window', 'rank'])
@Index(['portfolio_id', 'window'], { unique: true })
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'varchar', length: 8 })
  window!: LeaderboardWindow

  @Column({ type: 'int' })
  rank!: number

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  return_percent!: number

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: PortfolioV2
}
