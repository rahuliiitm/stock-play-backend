import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { BacktestResult } from './backtest-result.entity'
import { BacktestTrade } from './backtest-trade.entity'

@Entity('backtest_runs')
export class BacktestRun {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column()
  description: string

  @Column()
  symbol: string

  @Column()
  timeframe: string

  @Column('timestamp')
  startDate: Date

  @Column('timestamp')
  endDate: Date

  @Column('decimal', { precision: 15, scale: 2 })
  initialBalance: number

  @Column('json')
  strategyConfig: any

  @Column('json')
  backtestConfig: any

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

  @Column({ nullable: true })
  errorMessage: string

  @Column('timestamp', { nullable: true })
  startedAt: Date

  @Column('timestamp', { nullable: true })
  completedAt: Date

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalReturn: number

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  totalReturnPercentage: number

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  maxDrawdown: number

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  winRate: number

  @Column({ nullable: true })
  totalTrades: number

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  sharpeRatio: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => BacktestResult, result => result.backtestRun)
  results: BacktestResult[]

  @OneToMany(() => BacktestTrade, trade => trade.backtestRun)
  trades: BacktestTrade[]
}
