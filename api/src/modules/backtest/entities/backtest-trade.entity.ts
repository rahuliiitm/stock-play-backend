import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { BacktestRun } from './backtest-run.entity'

@Entity('backtest_trades')
export class BacktestTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  backtestRunId: string

  @Column('timestamp')
  entryTime: Date

  @Column('timestamp', { nullable: true })
  exitTime: Date

  @Column()
  symbol: string

  @Column()
  direction: 'LONG' | 'SHORT'

  @Column('decimal', { precision: 15, scale: 2 })
  entryPrice: number

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  exitPrice: number

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  pnl: number

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  pnlPercentage: number

  @Column({ nullable: true })
  duration: number

  @Column({ default: 'OPEN' })
  status: 'OPEN' | 'CLOSED'

  @Column('json', { nullable: true })
  metadata: any

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => BacktestRun, run => run.trades)
  @JoinColumn({ name: 'backtestRunId' })
  backtestRun: BacktestRun
}
