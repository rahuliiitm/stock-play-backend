import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './User.entity'

@Entity('broker_accounts')
@Index(['user_id', 'broker', 'account_id'], { unique: true })
export class BrokerAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  user_id!: string

  @Column({ type: 'varchar', length: 50 })
  broker!: string

  @Column({ type: 'varchar', length: 100 })
  account_id!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  account_name?: string

  @Column({ type: 'varchar', length: 255 })
  api_key!: string

  @Column({ type: 'varchar', length: 255 })
  api_secret!: string

  @Column({ type: 'text', nullable: true })
  access_token?: string

  @Column({ type: 'timestamptz', nullable: true })
  token_expires_at?: Date

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string

  @Column({ type: 'timestamptz', nullable: true })
  last_sync_at?: Date

  @Column({ type: 'text', nullable: true })
  last_sync_error?: string

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @OneToMany('RealHolding', 'broker_account')
  holdings!: any[]

  @OneToMany('RealPosition', 'broker_account')
  positions!: any[]

  @OneToMany('OrderHistory', 'broker_account')
  order_history!: any[]

  @OneToMany('PortfolioSnapshot', 'broker_account')
  portfolio_snapshots!: any[]

  @OneToMany('SyncBatch', 'broker_account')
  sync_batches!: any[]

  @OneToMany('BrokerToken', 'broker_account')
  tokens!: any[]
}