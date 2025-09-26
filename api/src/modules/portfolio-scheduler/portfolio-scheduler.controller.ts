import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { PortfolioSyncSchedulerService } from './portfolio-sync-scheduler.service'
import { BrokerAccountsService } from './broker-accounts.service'
// import { WorkingGrowwApiService } from '../broker/services/working-groww-api.service'
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
    // private readonly workingGrowwApiService: WorkingGrowwApiService,
    
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
   * Test endpoint to verify Groww API integration
   */
  @Get('test-groww')
  async testGrowwApi() {
    try {
      const axios = require('axios');
      const crypto = require('crypto');
      
      // Get credentials from environment
      const apiKey = process.env.GROWW_API_KEY;
      const apiSecret = process.env.GROWW_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        return { error: 'Groww API credentials not configured' };
      }
      
      // Get access token using TOTP flow
      const { authenticator } = require('otplib');
      const totp = authenticator.generate(apiSecret);
      
      const authResponse = await axios.post(
        'https://api.groww.in/v1/token/api/access',
        {
          key_type: 'totp',
          totp: totp
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.token;
      
      return {
        success: true,
        message: 'Groww API test successful',
        accessToken: accessToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Groww API test failed:', error);
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

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
  async getBrokerAccounts(@Query('userId') userId: string) {
    try {
      // Direct database query - simplified for testing
      const accounts = await this.brokerAccountsRepository.find({
        select: ['id', 'broker', 'account_id', 'account_name', 'status', 'created_at', 'last_sync_at']
      })
      
      return accounts.map(account => ({
        id: account.id,
        broker: account.broker,
        user_id: userId,
        account_name: account.account_name,
        is_active: account.status === 'active',
        created_at: account.created_at,
        last_sync: account.last_sync_at
      }))
    } catch (error) {
      console.error('Error fetching broker accounts:', error)
      return { error: error.message }
    }
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
   * Get current holdings for a broker account using direct Groww API
   */
  @Get('holdings/:accountId')
  async getHoldings(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    try {
      // Use the working direct API approach
      const axios = require('axios');
      const crypto = require('crypto');
      
      // Get credentials from environment
      const apiKey = process.env.GROWW_API_KEY;
      const apiSecret = process.env.GROWW_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        throw new Error('Groww API credentials not configured');
      }
      
      // Get access token using TOTP flow
      const { authenticator } = require('otplib');
      const totp = authenticator.generate(apiSecret);
      
      const authResponse = await axios.post(
        'https://api.groww.in/v1/token/api/access',
        {
          key_type: 'totp',
          totp: totp
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.token;
      
      // Get holdings from Groww API
      const holdingsResponse = await axios.get('https://api.groww.in/v1/holdings/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      });
      
      if (holdingsResponse.data.status === 'SUCCESS' && holdingsResponse.data.payload?.holdings) {
        const holdings = holdingsResponse.data.payload.holdings;
        
        // Transform Groww API response to our format
        return holdings.map((holding, index) => ({
          id: `groww-${holding.trading_symbol}-${index}`,
          symbol: holding.trading_symbol,
          quantity: holding.quantity,
          average_price: holding.average_price,
          current_price: holding.current_price || null,
          total_value: holding.current_price ? holding.quantity * holding.current_price : null,
          pnl: holding.current_price ? (holding.quantity * holding.current_price) - (holding.quantity * holding.average_price) : null,
          pnl_percentage: holding.current_price && holding.average_price ? 
            ((holding.current_price - holding.average_price) / holding.average_price) * 100 : null,
          last_updated: new Date().toISOString()
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching holdings from Groww API:', error);
      return { error: error.message };
    }
  }

  /**
   * Get current positions for a broker account using direct Groww API
   */
  @Get('positions/:accountId')
  async getPositions(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    try {
      // Use the working direct API approach
      const axios = require('axios');
      const crypto = require('crypto');
      
      // Get credentials from environment
      const apiKey = process.env.GROWW_API_KEY;
      const apiSecret = process.env.GROWW_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        throw new Error('Groww API credentials not configured');
      }
      
      // Get access token using TOTP flow
      const { authenticator } = require('otplib');
      const totp = authenticator.generate(apiSecret);
      
      const authResponse = await axios.post(
        'https://api.groww.in/v1/token/api/access',
        {
          key_type: 'totp',
          totp: totp
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.token;
      
      // Get positions from Groww API
      const positionsResponse = await axios.get('https://api.groww.in/v1/positions/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      });
      
      if (positionsResponse.data.status === 'SUCCESS' && positionsResponse.data.payload?.positions) {
        const positions = positionsResponse.data.payload.positions;
        
        // Transform Groww API response to our format
        return positions.map((position, index) => ({
          id: `groww-${position.trading_symbol}-${index}`,
          symbol: position.trading_symbol,
          segment: position.segment,
          net_quantity: position.net_quantity,
          net_price: position.net_price,
          net_value: position.net_value,
          pnl: position.pnl,
          pnl_percentage: position.pnl_percentage,
          last_updated: new Date().toISOString()
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching positions from Groww API:', error);
      return { error: error.message };
    }
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
   * Get portfolio summary for a broker account using direct Groww API
   */
  @Get('summary/:accountId')
  async getPortfolioSummary(
    @Param('accountId') accountId: string,
    @Query('userId') userId: string
  ) {
    try {
      // Use the working direct API approach
      const axios = require('axios');
      const crypto = require('crypto');
      
      // Get credentials from environment
      const apiKey = process.env.GROWW_API_KEY;
      const apiSecret = process.env.GROWW_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        throw new Error('Groww API credentials not configured');
      }
      
      // Get access token using TOTP flow
      const { authenticator } = require('otplib');
      const totp = authenticator.generate(apiSecret);
      
      const authResponse = await axios.post(
        'https://api.groww.in/v1/token/api/access',
        {
          key_type: 'totp',
          totp: totp
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.token;
      
      // Get holdings from Groww API
      const holdingsResponse = await axios.get('https://api.groww.in/v1/holdings/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0'
        }
      });
      
      if (holdingsResponse.data.status === 'SUCCESS' && holdingsResponse.data.payload?.holdings) {
        const holdings = holdingsResponse.data.payload.holdings;
        
        // Calculate portfolio summary from real Groww data
        const totalInvested = holdings.reduce((sum, h) => 
          sum + (h.quantity * h.average_price), 0);
        
        const currentValue = holdings.reduce((sum, h) => 
          sum + (h.current_price ? h.quantity * h.current_price : 0), 0);
        
        const totalPnl = currentValue - totalInvested;
        const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        
        return {
          total_invested: totalInvested,
          current_value: currentValue,
          total_pnl: totalPnl,
          total_pnl_percentage: totalPnlPercentage,
          holdings_count: holdings.length
        };
      } else {
        return {
          total_invested: 0,
          current_value: 0,
          total_pnl: 0,
          total_pnl_percentage: 0,
          holdings_count: 0
        };
      }
    } catch (error) {
      console.error('Error fetching portfolio summary from Groww API:', error);
      return { error: error.message };
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

  /**
   * Get complete position history for a symbol (buy-to-sell lifecycle)
   */
  @Get('position-history/:accountId/:symbol')
  async getPositionHistory(
    @Param('accountId') accountId: string,
    @Param('symbol') symbol: string,
    @Query('userId') userId: string
  ) {
    try {
      // Verify account belongs to user
      const account = await this.brokerAccountsRepository.findOne({
        where: { id: accountId, user_id: userId }
      })

      if (!account) {
        return { error: 'Account not found or access denied' }
      }

      const positionHistory = await this.portfolioSyncSchedulerService.getPositionHistory(accountId, symbol)
      
      return {
        success: true,
        accountId,
        symbol,
        positionHistory,
        totalRecords: positionHistory.length,
        message: `Complete position lifecycle for ${symbol}`
      }
    } catch (error) {
      console.error('Failed to get position history:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  }

}
