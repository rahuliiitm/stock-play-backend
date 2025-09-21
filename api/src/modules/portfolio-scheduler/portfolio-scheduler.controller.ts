import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { PortfolioSyncSchedulerService } from './portfolio-sync-scheduler.service'
import { BrokerAccountsService } from './broker-accounts.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BrokerAccount } from '../../entities/BrokerAccount.entity'
import { RealHolding } from '../../entities/RealHolding.entity'
import { RealPosition } from '../../entities/RealPosition.entity'
import { OrderHistory } from '../../entities/OrderHistory.entity'
import { OrderQuantityChange } from '../../entities/OrderQuantityChange.entity'
import { PortfolioSnapshot } from '../../entities/PortfolioSnapshot.entity'
import { SyncBatch } from '../../entities/SyncBatch.entity'

@Controller('portfolio-scheduler')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
export class PortfolioSchedulerController {
  constructor(
    private readonly portfolioSyncSchedulerService: PortfolioSyncSchedulerService,
    private readonly brokerAccountsService: BrokerAccountsService,
    
    @InjectRepository(BrokerAccount)
    private readonly brokerAccountsRepository: Repository<BrokerAccount>,
    
    @InjectRepository(RealHolding)
    private readonly realHoldingsRepository: Repository<RealHolding>,
    
    @InjectRepository(RealPosition)
    private readonly realPositionsRepository: Repository<RealPosition>,
    
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepository: Repository<OrderHistory>,
    
    @InjectRepository(OrderQuantityChange)
    private readonly orderQuantityChangesRepository: Repository<OrderQuantityChange>,
    
    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioSnapshotsRepository: Repository<PortfolioSnapshot>,
    
    @InjectRepository(SyncBatch)
    private readonly syncBatchesRepository: Repository<SyncBatch>,
  ) {}

  /**
   * Trigger manual portfolio sync for current user
   */
  @Post('sync')
  async triggerManualSync(@Query('userId') userId: string) {
    await this.portfolioSyncSchedulerService.manualSync(userId)
    return { message: 'Portfolio sync triggered successfully' }
  }

  /**
   * Create a new broker account
   */
  @Post('broker-accounts')
  async createBrokerAccount(
    @Query('userId') userId: string,
    @Body() body: {
      broker_name: string
      account_id: string
      api_key: string
      api_secret: string
    }
  ) {
    return this.brokerAccountsService.createBrokerAccount(
      userId,
      body.broker_name,
      body.account_id,
      body.api_key,
      body.api_secret
    )
  }

  /**
   * Get broker accounts for current user
   */
  @Get('broker-accounts')
  async getBrokerAccounts(@Param('userId') userId: string) {
    return this.brokerAccountsService.getBrokerAccounts(userId)
  }

  /**
   * Get a specific broker account
   */
  @Get('broker-accounts/:accountId')
  async getBrokerAccount(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    return this.brokerAccountsService.getBrokerAccount(accountId, userId)
  }

  /**
   * Update broker account
   */
  @Put('broker-accounts/:accountId')
  async updateBrokerAccount(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string,
    @Body() body: {
      apiKey?: string
      apiSecret?: string
      isActive?: boolean
    }
  ) {
    return this.brokerAccountsService.updateBrokerAccount(accountId, userId, body)
  }

  /**
   * Delete broker account
   */
  @Delete('broker-accounts/:accountId')
  async deleteBrokerAccount(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    await this.brokerAccountsService.deleteBrokerAccount(accountId, userId)
    return { message: 'Broker account deleted successfully' }
  }

  /**
   * Test broker account credentials
   */
  @Post('broker-accounts/:accountId/test')
  async testBrokerAccount(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    return this.brokerAccountsService.testBrokerAccount(accountId, userId)
  }

  /**
   * Refresh access token for broker account
   */
  @Post('broker-accounts/:accountId/refresh-token')
  async refreshAccessToken(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    return this.brokerAccountsService.refreshAccessToken(accountId, userId)
  }

  /**
   * Get current holdings for a broker account
   */
  @Get('holdings/:accountId')
  async getHoldings(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    // Verify account belongs to user
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    return this.realHoldingsRepository.find({
      where: { broker_account_id: accountId },
      order: { symbol: 'ASC' }
    })
  }

  /**
   * Get current positions for a broker account
   */
  @Get('positions/:accountId')
  async getPositions(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    // Verify account belongs to user
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    return this.realPositionsRepository.find({
      where: { broker_account_id: accountId },
      order: { symbol: 'ASC' }
    })
  }

  /**
   * Get order history for a broker account
   */
  @Get('orders/:accountId')
  async getOrderHistory(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string,
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 50
  ) {
    // Verify account belongs to user
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    const [orders, total] = await this.orderHistoryRepository.findAndCount({
      where: { broker_account_id: accountId },
      order: { created_at: 'DESC' },
      skip: page * limit,
      take: limit
    })

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get quantity changes for a specific symbol
   */
  @Get('quantity-changes/:symbol')
  async getQuantityChanges(
    @Param('symbol') symbol: string,
    @Query('userId') userId: string,
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 50
  ) {
    // Get user's broker accounts
    const accounts = await this.brokerAccountsRepository.find({
      where: { user_id: userId },
      select: ['id']
    })

    const accountIds = accounts.map(a => a.id)

    const [changes, total] = await this.orderQuantityChangesRepository.findAndCount({
      where: { 
        symbol,
        order_history: {
          broker_account_id: { $in: accountIds } as any
        }
      },
      relations: ['order_history'],
      order: { detected_at: 'DESC' },
      skip: page * limit,
      take: limit
    })

    return {
      changes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get portfolio snapshots for a broker account
   */
  @Get('snapshots/:accountId')
  async getPortfolioSnapshots(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string,
    @Query('days') days: number = 30
  ) {
    // Verify account belongs to user
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.portfolioSnapshotsRepository.find({
      where: { 
        broker_account_id: accountId,
        snapshot_date: { $gte: startDate } as any
      },
      order: { snapshot_date: 'DESC' }
    })
  }

  /**
   * Get sync batch history for a broker account
   */
  @Get('sync-history/:accountId')
  async getSyncHistory(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string,
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 20
  ) {
    // Verify account belongs to user
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    const [batches, total] = await this.syncBatchesRepository.findAndCount({
      where: { broker_account_id: accountId },
      order: { started_at: 'DESC' },
      skip: page * limit,
      take: limit
    })

    return {
      batches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get portfolio summary for a broker account
   */
  @Get('summary/:accountId')
  async getPortfolioSummary(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    // Verify account belongs to user
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    const [holdings, positions, latestSnapshot] = await Promise.all([
      this.realHoldingsRepository.find({ where: { broker_account_id: accountId } }),
      this.realPositionsRepository.find({ where: { broker_account_id: accountId } }),
      this.portfolioSnapshotsRepository.findOne({
        where: { broker_account_id: accountId },
        order: { snapshot_date: 'DESC' }
      })
    ])

    const totalHoldingsValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0)
    const totalPositionsValue = positions.reduce((sum, p) => sum + (p.net_quantity * p.net_price), 0)
    const totalPortfolioValue = totalHoldingsValue + totalPositionsValue

    return {
      account: {
        id: account.id,
        broker_name: account.broker,
        account_id: account.account_id,
        is_active: account.status === 'active'
      },
      portfolio: {
        total_holdings_value: totalHoldingsValue,
        total_positions_value: totalPositionsValue,
        total_portfolio_value: totalPortfolioValue,
        holdings_count: holdings.length,
        positions_count: positions.length
      },
      latest_snapshot: latestSnapshot,
      last_updated: Math.max(
        ...holdings.map(h => h.last_updated_at.getTime()),
        ...positions.map(p => p.last_updated_at.getTime())
      )
    }
  }

  /**
   * Admin endpoint to get all sync batches
   */
  @Get('admin/sync-batches')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllSyncBatches(
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string
  ) {
    const where: any = {}
    if (status) {
      where.status = status
    }

    const [batches, total] = await this.syncBatchesRepository.findAndCount({
      where,
      relations: ['broker_account'],
      order: { started_at: 'DESC' },
      skip: page * limit,
      take: limit
    })

    return {
      batches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}
