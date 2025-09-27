import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { BacktestRun } from './backtest-run.entity'

@Entity('backtest_results')
export class BacktestResult {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  backtestRunId: string

  @Column('timestamp')
  timestamp: Date

  @Column('decimal', { precision: 15, scale: 2 })
  balance: number

  @Column('decimal', { precision: 15, scale: 2 })
  equity: number

  @Column('decimal', { precision: 10, scale: 4 })
  drawdown: number

  @Column('decimal', { precision: 10, scale: 4 })
  returnPercentage: number

  @Column({ nullable: true })
  signal: string

  @Column('json', { nullable: true })
  diagnostics: any

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => BacktestRun, run => run.results)
  @JoinColumn({ name: 'backtestRunId' })
  backtestRun: BacktestRun
}
