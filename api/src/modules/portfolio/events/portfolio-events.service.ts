import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

export interface PortfolioCreatedEvent {
  userId: string
  portfolioId: string
  portfolioName: string
  visibility: string
  timestamp: Date
}

export interface PortfolioUpdatedEvent {
  userId: string
  portfolioId: string
  changes: Record<string, any>
  timestamp: Date
}

export interface HoldingAddedEvent {
  userId: string
  portfolioId: string
  symbol: string
  quantity: number
  priceCents: number
  timestamp: Date
}

export interface HoldingRemovedEvent {
  userId: string
  portfolioId: string
  symbol: string
  quantity: number
  priceCents: number
  timestamp: Date
}

export interface PortfolioSnapshotCreatedEvent {
  userId: string
  portfolioId: string
  snapshotId: string
  date: Date
  marketValueCents: number
  returnPercent: number
  timestamp: Date
}

export interface LeaderboardUpdatedEvent {
  window: string
  processed: number
  timestamp: Date
}

@Injectable()
export class PortfolioEventsService {
  private readonly logger = new Logger(PortfolioEventsService.name)

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // Portfolio events
  async emitPortfolioCreated(event: Omit<PortfolioCreatedEvent, 'timestamp'>): Promise<void> {
    const fullEvent: PortfolioCreatedEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting portfolio.created event: ${JSON.stringify(fullEvent)}`)
    await this.eventEmitter.emitAsync('portfolio.created', fullEvent)
  }

  async emitPortfolioUpdated(event: Omit<PortfolioUpdatedEvent, 'timestamp'>): Promise<void> {
    const fullEvent: PortfolioUpdatedEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting portfolio.updated event: ${JSON.stringify(fullEvent)}`)
    await this.eventEmitter.emitAsync('portfolio.updated', fullEvent)
  }

  // Holding events
  async emitHoldingAdded(event: Omit<HoldingAddedEvent, 'timestamp'>): Promise<void> {
    const fullEvent: HoldingAddedEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting portfolio.holding.added event: ${JSON.stringify(fullEvent)}`)
    await this.eventEmitter.emitAsync('portfolio.holding.added', fullEvent)
  }

  async emitHoldingRemoved(event: Omit<HoldingRemovedEvent, 'timestamp'>): Promise<void> {
    const fullEvent: HoldingRemovedEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting portfolio.holding.removed event: ${JSON.stringify(fullEvent)}`)
    await this.eventEmitter.emitAsync('portfolio.holding.removed', fullEvent)
  }

  // Snapshot events
  async emitPortfolioSnapshotCreated(event: Omit<PortfolioSnapshotCreatedEvent, 'timestamp'>): Promise<void> {
    const fullEvent: PortfolioSnapshotCreatedEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting portfolio.snapshot.created event: ${JSON.stringify(fullEvent)}`)
    await this.eventEmitter.emitAsync('portfolio.snapshot.created', fullEvent)
  }

  // Leaderboard events
  async emitLeaderboardUpdated(event: Omit<LeaderboardUpdatedEvent, 'timestamp'>): Promise<void> {
    const fullEvent: LeaderboardUpdatedEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting leaderboard.updated event: ${JSON.stringify(fullEvent)}`)
    await this.eventEmitter.emitAsync('leaderboard.updated', fullEvent)
  }

  // Broker events
  async emitBrokerAccountLinked(userId: string, brokerAccountId: string, broker: string): Promise<void> {
    const event = {
      userId,
      brokerAccountId,
      broker,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting broker.account.linked event: ${JSON.stringify(event)}`)
    await this.eventEmitter.emitAsync('broker.account.linked', event)
  }

  async emitBrokerAccountUnlinked(userId: string, brokerAccountId: string, broker: string): Promise<void> {
    const event = {
      userId,
      brokerAccountId,
      broker,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting broker.account.unlinked event: ${JSON.stringify(event)}`)
    await this.eventEmitter.emitAsync('broker.account.unlinked', event)
  }

  async emitBrokerSyncCompleted(userId: string, brokerAccountId: string, success: boolean, holdingsCount: number): Promise<void> {
    const event = {
      userId,
      brokerAccountId,
      success,
      holdingsCount,
      timestamp: new Date(),
    }

    this.logger.debug(`Emitting broker.sync.completed event: ${JSON.stringify(event)}`)
    await this.eventEmitter.emitAsync('broker.sync.completed', event)
  }
}

