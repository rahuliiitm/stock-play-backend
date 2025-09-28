import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type {
  PortfolioCreatedEvent,
  PortfolioUpdatedEvent,
  HoldingAddedEvent,
  HoldingRemovedEvent,
  PortfolioSnapshotCreatedEvent,
} from './portfolio-events.service';

@Injectable()
export class PortfolioEventsListener {
  private readonly logger = new Logger(PortfolioEventsListener.name);

  @OnEvent('portfolio.created')
  async handlePortfolioCreated(event: PortfolioCreatedEvent): Promise<void> {
    this.logger.log(
      `Portfolio created: ${event.portfolioName} for user ${event.userId}`,
    );

    // TODO: Implement additional actions:
    // - Send welcome notification
    // - Initialize portfolio with sample holdings if needed
    // - Update user statistics
    // - Trigger analytics events
  }

  @OnEvent('portfolio.updated')
  async handlePortfolioUpdated(event: PortfolioUpdatedEvent): Promise<void> {
    this.logger.log(
      `Portfolio updated: ${event.portfolioId} for user ${event.userId}`,
    );

    // TODO: Implement additional actions:
    // - Invalidate cached data
    // - Send notification to user about changes
    // - Update search indexes
  }

  @OnEvent('portfolio.holding.added')
  async handleHoldingAdded(event: HoldingAddedEvent): Promise<void> {
    this.logger.log(
      `Holding added: ${event.symbol} (${event.quantity}) to portfolio ${event.portfolioId}`,
    );

    // TODO: Implement additional actions:
    // - Update portfolio statistics
    // - Send notification about new holding
    // - Trigger rebalancing suggestions
    // - Update analytics
  }

  @OnEvent('portfolio.holding.removed')
  async handleHoldingRemoved(event: HoldingRemovedEvent): Promise<void> {
    this.logger.log(
      `Holding removed: ${event.symbol} (${event.quantity}) from portfolio ${event.portfolioId}`,
    );

    // TODO: Implement additional actions:
    // - Update portfolio statistics
    // - Check if portfolio is empty and suggest actions
    // - Send notification about removed holding
    // - Update analytics
  }

  @OnEvent('portfolio.snapshot.created')
  async handlePortfolioSnapshotCreated(
    event: PortfolioSnapshotCreatedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Portfolio snapshot created: ${event.portfolioId} for ${event.date.toISOString()}`,
    );

    // TODO: Implement additional actions:
    // - Calculate performance metrics
    // - Update portfolio rankings
    // - Generate performance reports
    // - Send periodic performance notifications
  }

  @OnEvent('broker.account.linked')
  async handleBrokerAccountLinked(event: any): Promise<void> {
    this.logger.log(
      `Broker account linked: ${event.broker} for user ${event.userId}`,
    );

    // TODO: Implement additional actions:
    // - Send confirmation notification
    // - Schedule automatic sync
    // - Update user profile with broker info
    // - Trigger initial data sync
  }

  @OnEvent('broker.account.unlinked')
  async handleBrokerAccountUnlinked(event: any): Promise<void> {
    this.logger.log(
      `Broker account unlinked: ${event.broker} for user ${event.userId}`,
    );

    // TODO: Implement additional actions:
    // - Clean up broker-related data
    // - Send confirmation notification
    // - Update user profile
    // - Cancel scheduled sync jobs
  }

  @OnEvent('broker.sync.completed')
  async handleBrokerSyncCompleted(event: any): Promise<void> {
    const status = event.success ? 'successful' : 'failed';
    this.logger.log(
      `Broker sync ${status}: ${event.holdingsCount} holdings for user ${event.userId}`,
    );

    // TODO: Implement additional actions:
    // - Send sync status notification
    // - Update sync statistics
    // - Handle sync failures (retry, alert, etc.)
    // - Update portfolio with new data
  }
}
