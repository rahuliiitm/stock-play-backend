import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Portfolio } from './Portfolio.entity'

@Entity('positions')
@Index(['portfolio_id', 'symbol'], { unique: true })
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity!: string

  @Column({ type: 'int' })
  avg_cost_cents!: number

  @Column({ type: 'int' })
  open_value_cents!: number

  @Column({ type: 'int', default: 0 })
  current_value_cents!: number

  @ManyToOne(() => Portfolio, (p) => p.positions)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: Portfolio
} 