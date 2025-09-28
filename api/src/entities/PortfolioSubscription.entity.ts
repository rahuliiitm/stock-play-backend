import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioV2 } from './PortfolioV2.entity';
import { User } from './User.entity';

@Entity('portfolio_subscriptions')
@Index(['portfolio_id', 'user_id'], { unique: true })
export class PortfolioSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  portfolio_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: PortfolioV2;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
