import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm'
import { Strategy } from './strategy.entity'

interface StoredCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type StrategyPhase = 'ENTRY' | 'ADJUSTMENT' | 'EXIT'

@Entity('strategy_runtime_states')
export class StrategyRuntimeState {
  @PrimaryColumn({ type: 'uuid' })
  strategyId: string

  @Column({ default: false })
  isRunning: boolean

  @Column({ type: 'varchar', length: 20, default: 'ENTRY' })
  currentPhase: StrategyPhase

  @Column({ type: 'varchar', length: 100, nullable: true })
  workerThreadId: string

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  lastHeartbeat: Date

  @Column({ type: 'jsonb', nullable: true })
  phaseStates: Record<string, PhaseState>

  @Column({ type: 'jsonb', nullable: true })
  lastProcessedCandle: StoredCandle

  @Column({ type: 'jsonb', nullable: true })
  currentPosition: any

  @Column({ type: 'jsonb', nullable: true })
  entrySignal: any

  @Column({ type: 'integer', default: 0 })
  errorCount: number

  @Column({ type: 'text', nullable: true })
  lastError?: string

  @Column({ type: 'integer', default: 0 })
  restartCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Relationship back to strategy
  @OneToOne(() => Strategy, strategy => strategy.runtimeState)
  strategy: Strategy

  // Helper methods
  isHealthy(maxAgeMinutes: number = 5): boolean {
    const age = Date.now() - this.lastHeartbeat.getTime()
    return age < (maxAgeMinutes * 60 * 1000)
  }

  shouldRestart(maxMissedHeartbeats: number = 3): boolean {
    const age = Date.now() - this.lastHeartbeat.getTime()
    const expectedHeartbeatInterval = 30 * 1000 // 30 seconds
    const missedHeartbeats = Math.floor(age / expectedHeartbeatInterval)
    return missedHeartbeats >= maxMissedHeartbeats
  }

  getPhaseState(phase: string): PhaseState | null {
    return this.phaseStates?.[phase] || null
  }

  updatePhaseState(phase: string, state: Partial<PhaseState>): void {
    if (!this.phaseStates) {
      this.phaseStates = {}
    }
    this.phaseStates[phase] = {
      ...this.phaseStates[phase],
      ...state,
      updatedAt: new Date()
    }
  }

  incrementErrorCount(error?: string): void {
    this.errorCount++
    if (error) {
      this.lastError = error
    } else {
      this.lastError = undefined
    }
    this.lastHeartbeat = new Date()
  }

  resetErrorCount(): void {
    this.errorCount = 0
    this.lastError = undefined
    this.lastHeartbeat = new Date()
  }

  markRestart(): void {
    this.restartCount++
    this.errorCount = 0
    this.lastError = undefined
    this.lastHeartbeat = new Date()
  }
}

export interface PhaseState {
  phase: string
  startTime: Date
  currentStep?: number
  executedNodes?: string[]
  timerStart?: Date
  waitCandles?: number
  customState?: any
  updatedAt: Date
}
