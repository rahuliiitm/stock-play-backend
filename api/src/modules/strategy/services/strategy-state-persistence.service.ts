import { Injectable, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { StrategyRuntimeState } from '../entities/strategy-runtime-state.entity'
import { Strategy } from '../entities/strategy.entity'
import { Redis } from 'ioredis'

@Injectable()
export class StrategyStatePersistenceService {
  private readonly logger = new Logger(StrategyStatePersistenceService.name)
  private readonly STATE_TTL = 3600 // 1 hour

  constructor(
    @InjectRepository(StrategyRuntimeState)
    private stateRepository: Repository<StrategyRuntimeState>,
    @InjectRepository(Strategy)
    private strategyRepository: Repository<Strategy>,
    @Inject('REDIS_CLIENT')
    private redis: Redis
  ) {}

  /**
   * Save strategy state to both Redis (fast) and database (persistent)
   */
  async saveStrategyState(strategyId: string, state: Partial<StrategyRuntimeState>): Promise<void> {
    try {
      // Save to Redis for fast access
      await this.redis.set(
        `strategy:state:${strategyId}`,
        JSON.stringify(state),
        'EX',
        this.STATE_TTL
      )

      // Save to database for persistence
      const existingState = await this.stateRepository.findOne({
        where: { strategyId }
      })

      const stateData = {
        ...state,
        lastHeartbeat: new Date()
      }

      if (existingState) {
        await this.stateRepository.update(
          { strategyId },
          stateData
        )
        this.logger.debug(`Updated state for strategy ${strategyId}`)
      } else {
        await this.stateRepository.save({
          strategyId,
          ...stateData
        })
        this.logger.debug(`Created new state for strategy ${strategyId}`)
      }
    } catch (error) {
      this.logger.error(`Failed to save state for strategy ${strategyId}:`, error)
      throw error
    }
  }

  /**
   * Load strategy state from Redis (fast) or database (fallback)
   */
  async loadStrategyState(strategyId: string): Promise<StrategyRuntimeState | null> {
    try {
      // Try Redis first for speed
      const redisState = await this.redis.get(`strategy:state:${strategyId}`)
      if (redisState) {
        const parsedState = JSON.parse(redisState)
        // Convert date strings back to Date objects
        if (parsedState.lastHeartbeat) {
          parsedState.lastHeartbeat = new Date(parsedState.lastHeartbeat)
        }
        if (parsedState.lastProcessedCandle?.timestamp) {
          parsedState.lastProcessedCandle.timestamp = new Date(parsedState.lastProcessedCandle.timestamp)
        }
        return parsedState
      }

      // Fallback to database
      const dbState = await this.stateRepository.findOne({
        where: { strategyId }
      })

      if (dbState) {
        this.logger.debug(`Loaded state from database for strategy ${strategyId}`)
        return dbState
      }

      return null
    } catch (error) {
      this.logger.error(`Failed to load state for strategy ${strategyId}:`, error)
      return null
    }
  }

  /**
   * Get all running strategies for recovery
   */
  async getAllRunningStrategies(): Promise<StrategyRuntimeState[]> {
    try {
      const runningStates = await this.stateRepository.find({
        where: { isRunning: true },
        order: { lastHeartbeat: 'DESC' }
      })

      this.logger.debug(`Found ${runningStates.length} running strategies`)
      return runningStates
    } catch (error) {
      this.logger.error('Failed to get running strategies:', error)
      return []
    }
  }

  /**
   * Mark strategy as stopped
   */
  async markStrategyAsStopped(strategyId: string): Promise<void> {
    try {
      await this.stateRepository.update(
        { strategyId },
        {
          isRunning: false,
          lastHeartbeat: new Date()
        }
      )

      // Remove from Redis
      await this.redis.del(`strategy:state:${strategyId}`)

      this.logger.debug(`Marked strategy ${strategyId} as stopped`)
    } catch (error) {
      this.logger.error(`Failed to mark strategy ${strategyId} as stopped:`, error)
      throw error
    }
  }

  /**
   * Update heartbeat for strategy
   */
  async updateHeartbeat(strategyId: string): Promise<void> {
    try {
      const heartbeat = new Date()

      // Update Redis
      const currentState = await this.loadStrategyState(strategyId)
      if (currentState) {
        currentState.lastHeartbeat = heartbeat
        await this.redis.set(
          `strategy:state:${strategyId}`,
          JSON.stringify(currentState),
          'EX',
          this.STATE_TTL
        )
      }

      // Update database
      await this.stateRepository.update(
        { strategyId },
        { lastHeartbeat: heartbeat }
      )
    } catch (error) {
      this.logger.error(`Failed to update heartbeat for strategy ${strategyId}:`, error)
    }
  }

  /**
   * Clean up stale states (strategies that haven't sent heartbeat for too long)
   */
  async cleanupStaleStates(maxAgeMinutes: number = 30): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000)

      const result = await this.stateRepository.update(
        {
          lastHeartbeat: LessThan(cutoffTime),
          isRunning: true
        },
        { isRunning: false }
      )

      const cleanedCount = result.affected || 0
      if (cleanedCount > 0) {
        this.logger.warn(`Cleaned up ${cleanedCount} stale strategy states`)
      }

      return cleanedCount
    } catch (error) {
      this.logger.error('Failed to cleanup stale states:', error)
      return 0
    }
  }

  /**
   * Get strategy health statistics
   */
  async getHealthStats(): Promise<{
    totalStrategies: number
    runningStrategies: number
    healthyStrategies: number
    unhealthyStrategies: number
    staleStates: number
  }> {
    try {
      const allStates = await this.stateRepository.find()
      const runningStates = allStates.filter(s => s.isRunning)

      const now = Date.now()
      const healthyStates = runningStates.filter(s =>
        (now - s.lastHeartbeat.getTime()) < (5 * 60 * 1000) // 5 minutes
      )

      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000)
      const staleStates = allStates.filter(s =>
        s.isRunning && s.lastHeartbeat < cutoffTime
      )

      return {
        totalStrategies: allStates.length,
        runningStrategies: runningStates.length,
        healthyStrategies: healthyStates.length,
        unhealthyStrategies: runningStates.length - healthyStates.length,
        staleStates: staleStates.length
      }
    } catch (error) {
      this.logger.error('Failed to get health stats:', error)
      return {
        totalStrategies: 0,
        runningStrategies: 0,
        healthyStrategies: 0,
        unhealthyStrategies: 0,
        staleStates: 0
      }
    }
  }

  /**
   * Backup all strategy states to database (called periodically)
   */
  async backupAllStates(): Promise<void> {
    try {
      const keys = await this.redis.keys('strategy:state:*')
      let backedUp = 0

      for (const key of keys) {
        const strategyId = key.replace('strategy:state:', '')
        const stateData = await this.redis.get(key)

        if (stateData) {
          const state = JSON.parse(stateData)
          await this.saveStrategyState(strategyId, state)
          backedUp++
        }
      }

      if (backedUp > 0) {
        this.logger.debug(`Backed up ${backedUp} strategy states`)
      }
    } catch (error) {
      this.logger.error('Failed to backup strategy states:', error)
    }
  }

  /**
   * Validate state consistency between Redis and database
   */
  async validateStateConsistency(): Promise<{
    consistent: number
    inconsistent: number
    missingInDb: number
    missingInRedis: number
  }> {
    try {
      const dbStates = await this.stateRepository.find()
      const redisKeys = await this.redis.keys('strategy:state:*')

      let consistent = 0
      let inconsistent = 0
      let missingInDb = 0
      let missingInRedis = 0

      // Check Redis states against database
      for (const key of redisKeys) {
        const strategyId = key.replace('strategy:state:', '')
        const redisState = await this.redis.get(key)
        const dbState = dbStates.find(s => s.strategyId === strategyId)

        if (!dbState) {
          missingInDb++
          continue
        }

        if (redisState) {
          const redisData = JSON.parse(redisState)
          // Compare key fields
          if (redisData.isRunning === dbState.isRunning &&
              redisData.currentPhase === dbState.currentPhase) {
            consistent++
          } else {
            inconsistent++
          }
        }
      }

      // Check for database states missing in Redis
      for (const dbState of dbStates) {
        const redisKey = `strategy:state:${dbState.strategyId}`
        const exists = await this.redis.exists(redisKey)
        if (!exists) {
          missingInRedis++
        }
      }

      return { consistent, inconsistent, missingInDb, missingInRedis }
    } catch (error) {
      this.logger.error('Failed to validate state consistency:', error)
      return { consistent: 0, inconsistent: 0, missingInDb: 0, missingInRedis: 0 }
    }
  }
}
