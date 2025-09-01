import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Strategy } from './strategy.entity'

export type ActionType =
  | 'SIGNAL_GENERATED'
  | 'ORDER_PLACED'
  | 'ORDER_EXECUTED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REJECTED'
  | 'ORDER_MODIFIED'
  | 'POSITION_OPENED'
  | 'POSITION_CLOSED'
  | 'POSITION_UPDATED'
  | 'STRATEGY_STARTED'
  | 'STRATEGY_STOPPED'
  | 'STRATEGY_ERROR'
  | 'PHASE_CHANGED'
  | 'HEARTBEAT'
  | 'LOG'

@Entity('strategy_execution_logs')
export class StrategyExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  @Index()
  strategyId: string

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  @Index()
  timestamp: Date

  @Column({ type: 'varchar', length: 20 })
  phase: string

  @Column({ type: 'varchar', length: 50 })
  action: ActionType

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  candleData: Record<string, any>

  @Column({ default: true })
  success: boolean

  @Column({ type: 'text', nullable: true })
  errorMessage: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent: string

  // Relationship
  @ManyToOne(() => Strategy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategy_id' })
  strategy: Strategy

  @CreateDateColumn()
  createdAt: Date

  // Helper methods
  static createLog(params: {
    strategyId: string
    phase: string
    action: ActionType
    details?: Record<string, any>
    candleData?: Record<string, any>
    success?: boolean
    errorMessage?: string
  }): StrategyExecutionLog {
    const log = new StrategyExecutionLog()
    log.strategyId = params.strategyId
    log.phase = params.phase
    log.action = params.action
    log.details = params.details || {}
    if (params.candleData) {
      log.candleData = params.candleData
    }
    log.success = params.success !== false
    if (params.errorMessage) {
      log.errorMessage = params.errorMessage
    }
    return log
  }

  // Static factory methods for common log types
  static signalGenerated(strategyId: string, phase: string, signal: any): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'SIGNAL_GENERATED',
      details: { signal }
    })
  }

  static orderPlaced(strategyId: string, phase: string, order: any): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'ORDER_PLACED',
      details: { order }
    })
  }

  static orderExecuted(strategyId: string, phase: string, order: any, execution: any): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'ORDER_EXECUTED',
      details: { order, execution }
    })
  }

  static positionOpened(strategyId: string, phase: string, position: any): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'POSITION_OPENED',
      details: { position }
    })
  }

  static positionClosed(strategyId: string, phase: string, position: any, reason: string): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'POSITION_CLOSED',
      details: { position, reason }
    })
  }

  static strategyError(strategyId: string, phase: string, error: Error): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'STRATEGY_ERROR',
      success: false,
      errorMessage: error.message,
      details: { stack: error.stack }
    })
  }

  static phaseChanged(strategyId: string, fromPhase: string, toPhase: string): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase: toPhase,
      action: 'PHASE_CHANGED',
      details: { fromPhase, toPhase }
    })
  }

  static heartbeat(strategyId: string, phase: string, status: any): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'HEARTBEAT',
      details: status
    })
  }

  static positionUpdated(strategyId: string, phase: string, positionData: any): StrategyExecutionLog {
    return this.createLog({
      strategyId,
      phase,
      action: 'POSITION_UPDATED',
      details: positionData
    })
  }

  // Get log age in minutes
  getAgeMinutes(): number {
    return Math.floor((Date.now() - this.timestamp.getTime()) / (1000 * 60))
  }

  // Check if log is recent (within last N minutes)
  isRecent(minutes: number = 5): boolean {
    return this.getAgeMinutes() <= minutes
  }

  // Format log for display
  toDisplayString(): string {
    const time = this.timestamp.toLocaleTimeString()
    const status = this.success ? '✅' : '❌'
    const error = this.errorMessage ? ` (${this.errorMessage})` : ''

    return `[${time}] ${status} ${this.phase} - ${this.action}${error}`
  }
}
