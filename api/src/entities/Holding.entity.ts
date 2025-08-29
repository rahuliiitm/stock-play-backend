import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { PortfolioV2 } from './PortfolioV2.entity'

@Entity('holdings')
@Index(['portfolio_id', 'symbol'], { unique: true })
export class Holding {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  portfolio_id!: string

  @Column({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'varchar', length: 8, default: 'NSE' })
  exchange!: 'NSE' | 'BSE'

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity!: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  avg_cost!: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  current_value!: number

  @ManyToOne(() => PortfolioV2, (p) => p.holdings)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: PortfolioV2
}
