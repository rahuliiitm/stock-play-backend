import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BrokerAccount } from './BrokerAccount.entity'

@Entity('real_positions')
@Index(['broker_account_id', 'symbol', 'exchange', 'segment'], { unique: true })
export class RealPosition {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  broker_account_id!: string

  @Column({ type: 'varchar', length: 20 })
  symbol!: string

  @Column({ type: 'varchar', length: 10, default: 'NSE' })
  exchange!: string

  @Column({ type: 'varchar', length: 10, default: 'CASH' })
  segment!: string

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  credit_quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit_price!: number

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  debit_quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit_price!: number

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  carry_forward_credit_quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  carry_forward_credit_price!: number

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  carry_forward_debit_quantity!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  carry_forward_debit_price!: number

  @Column({ type: 'decimal', precision: 18, scale: 4, generatedType: 'STORED', asExpression: 'credit_quantity - debit_quantity' })
  net_quantity!: number

  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 2, 
    generatedType: 'STORED', 
    asExpression: `CASE 
      WHEN (credit_quantity - debit_quantity) > 0 THEN credit_price
      WHEN (credit_quantity - debit_quantity) < 0 THEN debit_price
      ELSE 0
    END`
  })
  net_price!: number

  @Column({ type: 'timestamptz', default: () => 'now()' })
  last_updated_at!: Date

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @ManyToOne(() => BrokerAccount, (ba) => ba.positions)
  @JoinColumn({ name: 'broker_account_id' })
  broker_account!: BrokerAccount
}
