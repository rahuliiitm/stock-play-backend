import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  user_id!: string

  @Column({ type: 'text' })
  token_hash!: string

  @Column({ type: 'timestamptz' })
  expires_at!: Date

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date
} 