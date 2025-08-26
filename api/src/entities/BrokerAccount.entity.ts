import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './User.entity'
import { BrokerToken } from './BrokerToken.entity'

export type BrokerType = 'groww'

export type BrokerAccountStatus = 'active' | 'inactive' | 'error' | 'expired'

@Entity('broker_accounts')
@Index(['user_id', 'broker'], { unique: true })
export class BrokerAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  user_id!: string

  @Column({ type: 'varchar', length: 16 })
  broker!: BrokerType

  @Column({ type: 'varchar', length: 64 })
  account_id!: string // Groww account ID

  @Column({ type: 'varchar', length: 100 })
  account_name!: string

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: BrokerAccountStatus

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null // Additional broker-specific data

  @Column({ type: 'timestamptz', nullable: true })
  last_sync_at!: Date | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  last_sync_error!: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @OneToMany(() => BrokerToken, (token) => token.broker_account)
  tokens!: BrokerToken[]
}

