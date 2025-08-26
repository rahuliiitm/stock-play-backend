import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BrokerAccount } from '../../entities/BrokerAccount.entity'
import { BrokerToken } from '../../entities/BrokerToken.entity'
import { GrowwSource, GrowwHolding } from '../../lib/market-data-sdk/sources/groww'
import { HttpGet } from '../../lib/market-data-sdk/source'
import { GrowwAuthService } from '../stocks/providers/groww-auth.service'



export interface BrokerSyncResult {
  success: boolean
  holdingsCount: number
  error?: string
  syncedAt: Date
}

@Injectable()
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name)

  constructor(
    @InjectRepository(BrokerAccount)
    private readonly brokerAccounts: Repository<BrokerAccount>,
    @InjectRepository(BrokerToken)
    private readonly brokerTokens: Repository<BrokerToken>,
    private readonly growwAuth: GrowwAuthService,
  ) {}

  async linkGrowwAccount(
    userId: string,
    accountId: string,
    accountName: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
  ): Promise<BrokerAccount> {
    // Check if account already exists
    let account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    })

    if (account) {
      // Update existing account
      account.account_name = accountName
      account.status = 'active'
      account.last_sync_error = null
      account = await this.brokerAccounts.save(account)
    } else {
      // Create new account
      account = this.brokerAccounts.create({
        user_id: userId,
        broker: 'groww',
        account_id: accountId,
        account_name: accountName,
        status: 'active',
      })
      account = await this.brokerAccounts.save(account)
    }

    // Store tokens
    await this.storeToken(account.id, 'access', accessToken, expiresAt)
    if (refreshToken) {
      await this.storeToken(account.id, 'refresh', refreshToken)
    }

    return account
  }

  async unlinkGrowwAccount(userId: string, accountId: string): Promise<boolean> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    })

    if (!account) {
      return false
    }

    // Delete tokens first (cascade delete)
    await this.brokerTokens.delete({ broker_account_id: account.id })

    // Delete account
    await this.brokerAccounts.remove(account)

    return true
  }

  async getUserBrokerAccounts(userId: string): Promise<BrokerAccount[]> {
    return this.brokerAccounts.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    })
  }

  async getBrokerAccount(accountId: string): Promise<BrokerAccount | null> {
    return this.brokerAccounts.findOne({
      where: { id: accountId },
      relations: ['tokens'],
    })
  }

  private async storeToken(
    brokerAccountId: string,
    tokenType: 'access' | 'refresh',
    tokenValue: string,
    expiresAt?: Date,
  ): Promise<BrokerToken> {
    // Check if token already exists
    let token = await this.brokerTokens.findOne({
      where: { broker_account_id: brokerAccountId, token_type: tokenType },
    })

    if (token) {
      // Update existing token
      token.token_value = tokenValue
      token.expires_at = expiresAt || null
      token.updated_at = new Date()
    } else {
      // Create new token
      token = this.brokerTokens.create({
        broker_account_id: brokerAccountId,
        token_type: tokenType,
        token_value: tokenValue,
        expires_at: expiresAt || null,
      })
    }

    return this.brokerTokens.save(token)
  }

  async getValidAccessToken(brokerAccountId: string): Promise<string | null> {
    const accessToken = await this.brokerTokens.findOne({
      where: { broker_account_id: brokerAccountId, token_type: 'access' },
    })

    if (!accessToken) return null

    // Check if token is expired
    if (accessToken.expires_at && accessToken.expires_at <= new Date()) return null

    return accessToken.token_value
  }

  async refreshGrowwToken(brokerAccountId: string): Promise<boolean> {
    try {
      // Use TOTP auth service to mint a fresh token
      const token = await this.growwAuth.getAccessToken()
      if (!token) return false

      // Persist with a short expiry window (1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      await this.storeToken(brokerAccountId, 'access', token, expiresAt)
      return true
    } catch (error) {
      this.logger.error(`Failed to refresh token for broker account ${brokerAccountId}:`, error)
      return false
    }
  }

  async syncGrowwHoldings(userId: string, accountId: string): Promise<BrokerSyncResult> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    })

    if (!account) {
      return {
        success: false,
        holdingsCount: 0,
        error: 'Broker account not found',
        syncedAt: new Date(),
      }
    }

    try {
      // Get access token
      let accessToken = await this.getValidAccessToken(account.id)

      if (!accessToken) {
        // Try to refresh token
        const refreshed = await this.refreshGrowwToken(account.id)
        if (!refreshed) {
          // Mark account as expired
          account.status = 'expired'
          await this.brokerAccounts.save(account)

          return {
            success: false,
            holdingsCount: 0,
            error: 'Access token expired and refresh failed',
            syncedAt: new Date(),
          }
        }

        // Get refreshed token
        accessToken = await this.getValidAccessToken(account.id)
        if (!accessToken) {
          return {
            success: false,
            holdingsCount: 0,
            error: 'Failed to get valid access token',
            syncedAt: new Date(),
          }
        }
      }

      // Fetch holdings from Groww
      const holdings = await this.fetchGrowwHoldings(accessToken)

      // TODO: Convert Groww holdings to internal portfolio format and save
      // For now, just return success with count

      // Update account status
      account.status = 'active'
      account.last_sync_at = new Date()
      account.last_sync_error = null
      await this.brokerAccounts.save(account)

      return {
        success: true,
        holdingsCount: holdings.length,
        syncedAt: new Date(),
      }
    } catch (error) {
      // Update account with error
      account.status = 'error'
      account.last_sync_error = error.message || 'Unknown error'
      await this.brokerAccounts.save(account)

      return {
        success: false,
        holdingsCount: 0,
        error: error.message || 'Failed to sync holdings',
        syncedAt: new Date(),
      }
    }
  }

  private async fetchGrowwHoldings(accessToken: string): Promise<GrowwHolding[]> {
    // Create HTTP client for Groww API
    const httpGet: HttpGet = async (url: string, options) => {
      const axios = (await import('axios')).default

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-API-VERSION': '1.0',
          ...options?.headers,
        },
        params: options?.params,
      })

      return response.data
    }

    // Create Groww source with full API support
    const growwSource = new GrowwSource({
      httpGet,
      httpPost: async (url: string, data?: any, options?: any) => {
        const axios = (await import('axios')).default
        const response = await axios.post(url, data, {
          headers: options?.headers,
          params: options?.params,
        })
        return response.data
      },
      getAccessToken: async () => accessToken,
      baseUrl: process.env.GROWW_API_BASE || 'https://api.groww.in',
      apiKey: process.env.GROWW_API_KEY,
      appId: process.env.GROWW_APP_ID,
    })

    // Fetch holdings using Groww Portfolio API
    try {
      const holdings = await growwSource.getHoldings()
      return holdings
    } catch (error) {
      this.logger.error('Failed to fetch holdings from Groww:', error)
      throw new Error(`Failed to fetch holdings: ${error.message}`)
    }
  }

  async getBrokerAccountStatus(accountId: string): Promise<{
    status: string
    lastSyncAt: Date | null
    lastSyncError: string | null
  }> {
    const account = await this.getBrokerAccount(accountId)

    if (!account) {
      throw new Error('Broker account not found')
    }

    return {
      status: account.status,
      lastSyncAt: account.last_sync_at,
      lastSyncError: account.last_sync_error,
    }
  }

  // Additional Groww API methods
  async getGrowwOrders(userId: string, accountId: string): Promise<any[]> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    })

    if (!account) {
      throw new Error('Broker account not found')
    }

    const accessToken = await this.getValidAccessToken(account.id)
    if (!accessToken) {
      throw new Error('No valid access token')
    }

    const httpGet: HttpGet = async (url: string, options) => {
      const axios = (await import('axios')).default
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'StockPlay-Backend/1.0',
        },
        params: options?.params,
      })
      return response.data
    }

    const growwSource = new GrowwSource({
      httpGet,
      getAccessToken: async () => accessToken,
      baseUrl: process.env.GROWW_API_BASE || 'https://api.groww.in',
    })

    return growwSource.getOrders()
  }

  async getGrowwMargin(userId: string, accountId: string): Promise<any> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    })

    if (!account) {
      throw new Error('Broker account not found')
    }

    const accessToken = await this.getValidAccessToken(account.id)
    if (!accessToken) {
      throw new Error('No valid access token')
    }

    const httpGet: HttpGet = async (url: string, options) => {
      const axios = (await import('axios')).default
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'StockPlay-Backend/1.0',
        },
        params: options?.params,
      })
      return response.data
    }

    const growwSource = new GrowwSource({
      httpGet,
      getAccessToken: async () => accessToken,
      baseUrl: process.env.GROWW_API_BASE || 'https://api.groww.in',
    })

    return growwSource.getMargin()
  }

  async searchGrowwInstruments(query: string): Promise<any[]> {
    // For instrument search, we can use a public endpoint or minimal auth
    const httpGet: HttpGet = async (url: string, options) => {
      const axios = (await import('axios')).default
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'StockPlay-Backend/1.0',
        },
        params: options?.params,
      })
      return response.data
    }

    const growwSource = new GrowwSource({
      httpGet,
      baseUrl: process.env.GROWW_API_BASE || 'https://api.groww.in',
    })

    return growwSource.searchInstruments(query)
  }
}

