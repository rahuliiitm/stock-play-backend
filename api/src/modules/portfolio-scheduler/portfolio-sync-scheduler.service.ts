import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { Redis } from 'ioredis'
import { Inject } from '@nestjs/common'

import { GrowwApiService } from '../broker/services/groww-api.service'
import { BrokerAccount } from '../../entities/BrokerAccount.entity'
import { RealHolding } from '../../entities/RealHolding.entity'
import { RealPosition } from '../../entities/RealPosition.entity'
import { OrderHistory } from '../../entities/OrderHistory.entity'
import { OrderQuantityChange, ChangeType } from '../../entities/OrderQuantityChange.entity'
import { PortfolioSnapshot } from '../../entities/PortfolioSnapshot.entity'
import { SyncBatch, SyncType, SyncStatus } from '../../entities/SyncBatch.entity'

@Injectable()
export class PortfolioSyncSchedulerService {
  private readonly logger = new Logger(PortfolioSyncSchedulerService.name)
  private isRunning = false

  constructor(
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
    
    private readonly growwApiService: GrowwApiService,
  ) {}

  /**
   * Daily portfolio sync at 4:00 PM IST (after market closes at 3:30 PM)
   * Runs Monday to Friday only
   */
  @Cron('0 16 * * 1-5') // 4:00 PM IST, Monday to Friday
  async dailyPortfolioSync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Portfolio sync already running, skipping this execution')
      return
    }

    this.isRunning = true
    this.logger.log('🚀 Starting daily portfolio sync at 4:00 PM IST')

    try {
      const activeAccounts = await this.getActiveBrokerAccounts()
      this.logger.log(`Found ${activeAccounts.length} active broker accounts`)

      for (const account of activeAccounts) {
        await this.syncAccountPortfolio(account)
      }

      this.logger.log('✅ Daily portfolio sync completed successfully')
    } catch (error) {
      this.logger.error('❌ Daily portfolio sync failed:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Manual sync trigger for real-time updates
   */
  async manualSync(userId: string): Promise<void> {
    this.logger.log(`🔄 Manual sync triggered for user: ${userId}`)

    const accounts = await this.brokerAccountsRepository.find({
      where: { user_id: userId, status: 'active' }
    })

    for (const account of accounts) {
      await this.syncAccountPortfolio(account)
    }
  }

  /**
   * Get all active broker accounts
   */
  private async getActiveBrokerAccounts(): Promise<BrokerAccount[]> {
    return this.brokerAccountsRepository.find({
      where: { status: 'active' },
      relations: ['user']
    })
  }

  /**
   * Sync portfolio for a specific broker account
   */
  private async syncAccountPortfolio(account: BrokerAccount): Promise<void> {
    const syncBatch = await this.createSyncBatch(account, 'DAILY_PORTFOLIO')
    
    try {
      this.logger.log(`📊 Syncing portfolio for account: ${account.id} (${account.broker})`)

      // Use the injected GrowwApiService with the account's access token
      // Note: We need to set the access token for this specific account
      if (!account.access_token) {
        throw new Error('No access token available for this account')
      }
      this.growwApiService.setAccessToken(account.access_token)

      // Step 1: Fetch current data from Groww API
      const [holdings, positions, orders] = await Promise.all([
        this.growwApiService.getHoldings(),
        this.growwApiService.getPositions(),
        this.growwApiService.getOrderList(0, 100) // Get recent 100 orders
      ])

      this.logger.log(`📈 Fetched data: ${holdings.length} holdings, ${positions.length} positions, ${orders.order_list?.length || 0} orders`)

      // Update sync batch with fetched counts
      syncBatch.holdings_fetched = holdings.length
      syncBatch.positions_fetched = positions.length
      syncBatch.orders_fetched = orders.order_list?.length || 0

      // Step 2: Update holdings
      await this.updateHoldings(account, holdings, syncBatch)

      // Step 3: Update positions  
      await this.updatePositions(account, positions, syncBatch)

      // Step 4: Process order history
      await this.processOrderHistory(account, orders.order_list || [], syncBatch)

      // Step 5: Create daily snapshot
      await this.createDailySnapshot(account, syncBatch)

      // Step 6: Complete sync batch
      await this.completeSyncBatch(syncBatch, 'COMPLETED')

      this.logger.log(`✅ Portfolio sync completed for account: ${account.id}`)

    } catch (error) {
      this.logger.error(`❌ Portfolio sync failed for account ${account.id}:`, error)
      await this.completeSyncBatch(syncBatch, 'FAILED', error)
    }
  }

  /**
   * Update holdings data
   */
  private async updateHoldings(
    account: BrokerAccount,
    holdings: any[],
    syncBatch: SyncBatch
  ): Promise<void> {
    this.logger.log(`📊 Updating ${holdings.length} holdings for account: ${account.id}`)

    for (const holding of holdings) {
      const existingHolding = await this.realHoldingsRepository.findOne({
        where: {
          broker_account_id: account.id,
          symbol: holding.trading_symbol,
          exchange: 'NSE'
        }
      })

      if (existingHolding) {
        // Update existing holding
        await this.realHoldingsRepository.update(existingHolding.id, {
          quantity: holding.quantity,
          average_price: holding.average_price,
          current_price: holding.current_price,
          current_value: holding.current_value,
          pledge_quantity: holding.pledge_quantity || 0,
          demat_locked_quantity: holding.demat_locked_quantity || 0,
          groww_locked_quantity: holding.groww_locked_quantity || 0,
          last_updated_at: new Date()
        })
      } else {
        // Create new holding
        await this.realHoldingsRepository.save({
          broker_account_id: account.id,
          symbol: holding.trading_symbol,
          exchange: 'NSE',
          isin: holding.isin,
          quantity: holding.quantity,
          average_price: holding.average_price,
          current_price: holding.current_price,
          current_value: holding.current_value,
          pledge_quantity: holding.pledge_quantity || 0,
          demat_locked_quantity: holding.demat_locked_quantity || 0,
          groww_locked_quantity: holding.groww_locked_quantity || 0
        })
      }
    }

    syncBatch.holdings_updated = holdings.length
    await this.syncBatchesRepository.save(syncBatch)
  }

  /**
   * Update positions data
   */
  private async updatePositions(
    account: BrokerAccount,
    positions: any[],
    syncBatch: SyncBatch
  ): Promise<void> {
    this.logger.log(`📊 Updating ${positions.length} positions for account: ${account.id}`)

    for (const position of positions) {
      const existingPosition = await this.realPositionsRepository.findOne({
        where: {
          broker_account_id: account.id,
          symbol: position.trading_symbol,
          exchange: 'NSE',
          segment: position.segment || 'CASH'
        }
      })

      if (existingPosition) {
        // Update existing position
        await this.realPositionsRepository.update(existingPosition.id, {
          credit_quantity: position.credit_quantity || 0,
          credit_price: position.credit_price || 0,
          debit_quantity: position.debit_quantity || 0,
          debit_price: position.debit_price || 0,
          carry_forward_credit_quantity: position.carry_forward_credit_quantity || 0,
          carry_forward_credit_price: position.carry_forward_credit_price || 0,
          carry_forward_debit_quantity: position.carry_forward_debit_quantity || 0,
          carry_forward_debit_price: position.carry_forward_debit_price || 0,
          last_updated_at: new Date()
        })
      } else {
        // Create new position
        await this.realPositionsRepository.save({
          broker_account_id: account.id,
          symbol: position.trading_symbol,
          exchange: 'NSE',
          segment: position.segment || 'CASH',
          credit_quantity: position.credit_quantity || 0,
          credit_price: position.credit_price || 0,
          debit_quantity: position.debit_quantity || 0,
          debit_price: position.debit_price || 0,
          carry_forward_credit_quantity: position.carry_forward_credit_quantity || 0,
          carry_forward_credit_price: position.carry_forward_credit_price || 0,
          carry_forward_debit_quantity: position.carry_forward_debit_quantity || 0,
          carry_forward_debit_price: position.carry_forward_debit_price || 0
        })
      }
    }

    syncBatch.positions_updated = positions.length
    await this.syncBatchesRepository.save(syncBatch)
  }

  /**
   * Process order history and detect changes
   */
  private async processOrderHistory(
    account: BrokerAccount,
    orders: any[],
    syncBatch: SyncBatch
  ): Promise<void> {
    this.logger.log(`📊 Processing ${orders.length} orders for account: ${account.id}`)

    let ordersCreated = 0
    let quantityChangesDetected = 0

    for (const order of orders) {
      // Check if order already exists
      const existingOrder = await this.orderHistoryRepository.findOne({
        where: { groww_order_id: order.groww_order_id }
      })

      if (!existingOrder) {
        // New order - create record
        await this.createOrderHistoryRecord(account, order, syncBatch)
        ordersCreated++
      } else {
        // Existing order - check for changes
        const changes = await this.checkOrderChanges(existingOrder, order, syncBatch)
        quantityChangesDetected += changes
      }
    }

    syncBatch.orders_created = ordersCreated
    syncBatch.quantity_changes_detected = quantityChangesDetected
    await this.syncBatchesRepository.save(syncBatch)

    this.logger.log(`📊 Order processing: ${ordersCreated} new orders, ${quantityChangesDetected} changes detected`)
  }

  /**
   * Create new order history record
   */
  private async createOrderHistoryRecord(
    account: BrokerAccount,
    order: any,
    syncBatch: SyncBatch
  ): Promise<void> {
    const orderHistory = new OrderHistory()
    orderHistory.broker_account_id = account.id
    orderHistory.groww_order_id = order.groww_order_id
    orderHistory.order_reference_id = order.order_reference_id
    orderHistory.symbol = order.trading_symbol
    orderHistory.exchange = order.exchange || 'NSE'
    orderHistory.segment = order.segment || 'CASH'
    orderHistory.product = order.product
    orderHistory.order_type = order.order_type
    orderHistory.transaction_type = order.transaction_type
    orderHistory.quantity = order.quantity
    orderHistory.price = order.price
    orderHistory.trigger_price = order.trigger_price
    orderHistory.validity = order.validity
    orderHistory.order_status = order.order_status
    orderHistory.filled_quantity = order.filled_quantity || 0
    orderHistory.remaining_quantity = order.remaining_quantity || 0
    orderHistory.average_fill_price = order.average_fill_price
    orderHistory.deliverable_quantity = order.deliverable_quantity || 0
    orderHistory.amo_status = order.amo_status
    orderHistory.created_at = new Date(order.created_at)
    orderHistory.exchange_time = order.exchange_time ? new Date(order.exchange_time) : undefined
    orderHistory.trade_date = order.trade_date ? new Date(order.trade_date) : undefined
    orderHistory.remark = order.remark
    orderHistory.sync_batch_id = syncBatch.id

    await this.orderHistoryRepository.save(orderHistory)

    // If this is a new order with filled quantity, create a quantity change record
    if (order.filled_quantity > 0) {
      await this.createQuantityChangeRecord(
        orderHistory,
        order.symbol,
        'ORDER_PLACED',
        0,
        order.filled_quantity,
        order.filled_quantity,
        order.average_fill_price,
        'ORDER_EXECUTED',
        syncBatch.id
      )
    }
  }

  /**
   * Check for changes in existing order
   */
  private async checkOrderChanges(
    existingOrder: OrderHistory,
    newOrderData: any,
    syncBatch: SyncBatch
  ): Promise<number> {
    let changesCount = 0

    // Check quantity changes
    if (existingOrder.filled_quantity !== newOrderData.filled_quantity) {
      const quantityDelta = newOrderData.filled_quantity - existingOrder.filled_quantity
      
      await this.createQuantityChangeRecord(
        existingOrder,
        existingOrder.symbol,
        quantityDelta > 0 ? 'QUANTITY_ADDED' : 'QUANTITY_REMOVED',
        existingOrder.filled_quantity,
        newOrderData.filled_quantity,
        quantityDelta,
        newOrderData.average_fill_price,
        'ORDER_EXECUTED',
        syncBatch.id
      )

      changesCount++

      // Update the order record
      await this.orderHistoryRepository.update(existingOrder.id, {
        filled_quantity: newOrderData.filled_quantity,
        remaining_quantity: newOrderData.remaining_quantity,
        average_fill_price: newOrderData.average_fill_price,
        order_status: newOrderData.order_status
      })
    }

    // Check status changes
    if (existingOrder.order_status !== newOrderData.order_status) {
      await this.createQuantityChangeRecord(
        existingOrder,
        existingOrder.symbol,
        'STATUS_CHANGED',
        existingOrder.filled_quantity,
        newOrderData.filled_quantity,
        0,
        newOrderData.average_fill_price,
        `STATUS_CHANGED_${existingOrder.order_status}_TO_${newOrderData.order_status}`,
        syncBatch.id
      )

      changesCount++
    }

    return changesCount
  }

  /**
   * Create quantity change record
   */
  private async createQuantityChangeRecord(
    orderHistory: OrderHistory,
    symbol: string,
    changeType: ChangeType,
    previousQuantity: number,
    newQuantity: number,
    quantityDelta: number,
    priceAtChange: number,
    changeReason: string,
    syncBatchId: string
  ): Promise<void> {
    const quantityChange = this.orderQuantityChangesRepository.create({
      order_history_id: orderHistory.id,
      symbol,
      change_type: changeType,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      quantity_delta: quantityDelta,
      price_at_change: priceAtChange,
      change_reason: changeReason,
      sync_batch_id: syncBatchId
    })

    await this.orderQuantityChangesRepository.save(quantityChange)
  }

  /**
   * Create daily portfolio snapshot
   */
  private async createDailySnapshot(
    account: BrokerAccount,
    syncBatch: SyncBatch
  ): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of day

    // Check if snapshot already exists for today
    const existingSnapshot = await this.portfolioSnapshotsRepository.findOne({
      where: {
        broker_account_id: account.id,
        snapshot_date: today
      }
    })

    if (existingSnapshot) {
      this.logger.log(`📊 Snapshot already exists for today for account: ${account.id}`)
      return
    }

    // Calculate portfolio values
    const holdings = await this.realHoldingsRepository.find({
      where: { broker_account_id: account.id }
    })

    const positions = await this.realPositionsRepository.find({
      where: { broker_account_id: account.id }
    })

    const totalHoldingsValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0)
    const totalPositionsValue = positions.reduce((sum, p) => sum + (p.net_quantity * p.net_price), 0)
    const totalPortfolioValue = totalHoldingsValue + totalPositionsValue

    // Get previous day's snapshot for comparison
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const previousSnapshot = await this.portfolioSnapshotsRepository.findOne({
      where: {
        broker_account_id: account.id,
        snapshot_date: yesterday
      }
    })

    const dayChange = previousSnapshot 
      ? totalPortfolioValue - previousSnapshot.total_portfolio_value
      : 0

    const dayChangePercent = previousSnapshot && previousSnapshot.total_portfolio_value > 0
      ? (dayChange / previousSnapshot.total_portfolio_value) * 100
      : 0

    // Create snapshot
    const snapshot = this.portfolioSnapshotsRepository.create({
      broker_account_id: account.id,
      snapshot_date: today,
      total_holdings_value: totalHoldingsValue,
      total_positions_value: totalPositionsValue,
      total_portfolio_value: totalPortfolioValue,
      day_change: dayChange,
      day_change_percent: dayChangePercent,
      holdings_count: holdings.length,
      positions_count: positions.length,
      orders_count: syncBatch.orders_fetched,
      trades_count: syncBatch.quantity_changes_detected
    })

    await this.portfolioSnapshotsRepository.save(snapshot)
    this.logger.log(`📊 Created daily snapshot for account: ${account.id} - Value: ₹${totalPortfolioValue.toLocaleString()}`)
  }

  /**
   * Create sync batch record
   */
  private async createSyncBatch(account: BrokerAccount, syncType: SyncType): Promise<SyncBatch> {
    const syncBatch = this.syncBatchesRepository.create({
      broker_account_id: account.id,
      sync_type: syncType,
      status: 'STARTED'
    })

    return this.syncBatchesRepository.save(syncBatch)
  }

  /**
   * Complete sync batch
   */
  private async completeSyncBatch(
    syncBatch: SyncBatch, 
    status: SyncStatus, 
    error?: any
  ): Promise<void> {
    syncBatch.status = status
    syncBatch.completed_at = new Date()

    if (error) {
      syncBatch.errors_count = 1
      syncBatch.error_details = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }

    await this.syncBatchesRepository.save(syncBatch)
  }
}
