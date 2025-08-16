import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('stock_symbols')
export class StockSymbol {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  symbol!: string

  @PrimaryColumn({ type: 'varchar', length: 16 })
  exchange!: string

  @Column({ type: 'text', nullable: true })
  name!: string | null

  @Column({ type: 'varchar', length: 16, nullable: true })
  series!: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  isin!: string | null

  @Column({ type: 'int', nullable: true })
  lot_size!: number | null

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  face_value!: string | null

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'inactive'

  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at!: Date | null

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date
} 