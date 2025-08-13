import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('stock_symbols')
export class StockSymbol {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'text', nullable: true })
  name!: string | null

  @Column({ type: 'varchar', length: 16, nullable: true })
  exchange!: string | null

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'inactive'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date
} 