import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioV2 } from './PortfolioV2.entity';
import { User } from './User.entity';

@Entity('portfolio_comments')
@Index(['portfolio_id', 'created_at'])
export class PortfolioComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  portfolio_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  root_id!: string | null;

  @Column({ type: 'smallint', default: 0 })
  depth!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => PortfolioV2)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: PortfolioV2;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => PortfolioComment)
  @JoinColumn({ name: 'parent_id' })
  parent!: PortfolioComment | null;

  @OneToMany(() => PortfolioComment, (c) => c.parent)
  children!: PortfolioComment[];
}
