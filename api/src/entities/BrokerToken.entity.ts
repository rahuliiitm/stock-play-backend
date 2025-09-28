import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BrokerAccount } from './BrokerAccount.entity';

export type TokenType = 'access' | 'refresh';

@Entity('broker_tokens')
@Index(['broker_account_id', 'token_type'], { unique: true })
export class BrokerToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  broker_account_id!: string;

  @Column({ type: 'varchar', length: 16 })
  token_type!: TokenType;

  @Column({ type: 'text' })
  token_value!: string;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null; // Additional token data

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => BrokerAccount, (account) => account.tokens)
  @JoinColumn({ name: 'broker_account_id' })
  broker_account!: BrokerAccount;
}
