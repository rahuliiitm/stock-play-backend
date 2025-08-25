import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Portfolio } from './Portfolio.entity'
import { User } from './User.entity'

@Entity('portfolio_subscriptions')
@Index(['portfolio_id', 'user_id'], { unique: true })
export class PortfolioSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'uuid' })
  user_id!: string

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: Portfolio

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User
} 