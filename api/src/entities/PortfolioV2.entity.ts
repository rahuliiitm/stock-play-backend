import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';
import { Holding } from './Holding.entity';

export type PortfolioVisibility = 'public' | 'unlisted' | 'private';

@Entity('portfolios_v2')
@Index(['user_id', 'name'], { unique: true })
export class PortfolioV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility!: PortfolioVisibility;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  initial_value!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Holding, (h) => h.portfolio)
  holdings!: Holding[];
}
