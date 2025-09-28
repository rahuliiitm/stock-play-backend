import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { StrategyRuntimeState } from './strategy-runtime-state.entity';
import { StrategyPosition } from './strategy-position.entity';
import { StrategyOrder } from './strategy-order.entity';

export type ConfigType = 'PATH_BASED' | 'RULE_BASED' | 'HYBRID';
export type InstrumentType = 'CNC' | 'MIS';
export type TimeframeType = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type AssetType = 'STOCK' | 'FUTURES' | 'OPTIONS';

@Entity('trading_strategies')
export class Strategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20 })
  configType: ConfigType;

  // Asset Configuration
  @Column({ length: 50 })
  underlyingSymbol: string;

  @Column({ type: 'varchar', length: 10 })
  assetType: AssetType;

  @Column({ type: 'varchar', length: 10, nullable: true })
  instrumentType: InstrumentType;

  @Column({ type: 'varchar', length: 10 })
  timeframe: TimeframeType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  expiry: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  strike: number;

  @Column({ type: 'varchar', length: 5, nullable: true })
  optionType: 'CE' | 'PE';

  // Configuration Storage
  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  orderStrategy: Record<string, any>;

  @Column({ type: 'jsonb' })
  riskManagement: Record<string, any>;

  // Runtime State Relationship
  @OneToOne(() => StrategyRuntimeState, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_state_id' })
  runtimeState?: StrategyRuntimeState;

  // Positions Relationship
  @OneToMany(() => StrategyPosition, (position) => position.strategy, {
    cascade: true,
  })
  positions?: StrategyPosition[];

  // Orders Relationship
  @OneToMany(() => StrategyOrder, (order) => order.strategy, { cascade: true })
  orders?: StrategyOrder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isRunning(): boolean {
    return this.runtimeState?.isRunning || false;
  }

  getCurrentPhase(): string {
    return this.runtimeState?.currentPhase || 'ENTRY';
  }

  getOpenPositions(): StrategyPosition[] {
    return this.positions?.filter((p) => p.status === 'OPEN') || [];
  }

  getTotalPnL(): number {
    return (
      this.positions?.reduce((total, pos) => total + (pos.pnl || 0), 0) || 0
    );
  }
}
