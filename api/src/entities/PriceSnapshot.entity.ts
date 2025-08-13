import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('price_snapshots')
@Index(['symbol', 'as_of', 'source'], { unique: true })
export class PriceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 16 })
  symbol!: string

  @Column({ type: 'int' })
  price_cents!: number

  @Column({ type: 'timestamptz' })
  as_of!: Date

  @Column({ type: 'varchar', length: 32 })
  source!: string

  @Column({ type: 'jsonb', nullable: true })
  provider_payload!: Record<string, any> | null
} 