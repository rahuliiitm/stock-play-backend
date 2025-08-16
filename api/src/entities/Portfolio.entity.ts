import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ContestParticipant } from './ContestParticipant.entity'
import { Position } from './Position.entity'

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', unique: true })
  participant_id!: string

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  last_mark_to_market_amount!: number

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date

  @OneToOne(() => ContestParticipant, (p) => p.portfolio)
  @JoinColumn({ name: 'participant_id' })
  participant!: ContestParticipant

  @OneToMany(() => Position, (pos) => pos.portfolio)
  positions!: Position[]
} 