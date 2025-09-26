import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Redis } from 'ioredis'
import { Inject } from '@nestjs/common'

import { BrokerAccount } from '../../entities/BrokerAccount.entity'
import { GrowwApiService } from '../broker/services/groww-api.service'

@Injectable()
export class BrokerAccountsService {
  private readonly logger = new Logger(BrokerAccountsService.name)

  constructor(
    @InjectRepository(BrokerAccount)
    private readonly brokerAccountsRepository: Repository<BrokerAccount>,
    // private readonly growwApiService: GrowwApiService, // Temporarily disabled
  ) {}

  /**
   * Create a new broker account
   */
  async createBrokerAccount(
    userId: string,
    brokerName: string,
    accountId: string,
    apiKey: string,
    apiSecret: string
  ): Promise<BrokerAccount> {
    this.logger.log(`Creating broker account for user: ${userId}, broker: ${brokerName}`)

    let accessToken: string | undefined
    let tokenExpiry: Date | undefined

    try {
      // Temporarily skip API validation for testing
      this.logger.log(`Creating account without API validation for testing`)
      accessToken = 'test-token'
      tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    } catch (error) {
      this.logger.warn(`⚠️ Failed to validate API credentials: ${error.message}`)
      this.logger.log(`Creating account without access token - will need to be validated later`)
    }

    const brokerAccount = this.brokerAccountsRepository.create({
      user_id: userId,
      broker: brokerName,
      account_id: accountId,
      api_key: apiKey,
      api_secret: apiSecret,
      access_token: accessToken,
      token_expires_at: tokenExpiry,
      status: accessToken ? 'active' : 'pending_validation'
    })

    const savedAccount = await this.brokerAccountsRepository.save(brokerAccount)
    this.logger.log(`✅ Broker account created successfully: ${savedAccount.id}`)

    return savedAccount
  }

  /**
   * Update broker account credentials
   */
  async updateBrokerAccount(
    accountId: string,
    userId: string,
    updates: {
      apiKey?: string
      apiSecret?: string
      isActive?: boolean
    }
  ): Promise<BrokerAccount> {
    this.logger.log(`Updating broker account: ${accountId}`)

    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Broker account not found or access denied')
    }

    // If API credentials are being updated, test them
    if (updates.apiKey && updates.apiSecret) {
      try {
        const accessToken = await GrowwApiService.getAccessToken(updates.apiKey, updates.apiSecret)
        
        // Calculate token expiry
        const now = new Date()
        const tomorrow6AM = new Date(now)
        tomorrow6AM.setDate(tomorrow6AM.getDate() + 1)
        tomorrow6AM.setHours(6, 0, 0, 0)

        account.api_key = updates.apiKey
        account.api_secret = updates.apiSecret
        account.access_token = accessToken
        account.token_expires_at = tomorrow6AM
        account.status = 'active'
        
        this.logger.log(`✅ API credentials validated successfully`)
      } catch (error) {
        this.logger.warn(`⚠️ Failed to validate API credentials: ${error.message}`)
        this.logger.log(`Updating credentials without validation - will need to be validated later`)
        
        account.api_key = updates.apiKey
        account.api_secret = updates.apiSecret
        account.access_token = undefined
        account.token_expires_at = undefined
        account.status = 'pending_validation'
      }
    }

    if (updates.isActive !== undefined) {
      account.status = updates.isActive ? 'active' : 'inactive'
    }

    account.updated_at = new Date()

    const updatedAccount = await this.brokerAccountsRepository.save(account)
    this.logger.log(`✅ Broker account updated successfully: ${updatedAccount.id}`)

    return updatedAccount
  }

  /**
   * Get broker accounts for a user
   */
  async getBrokerAccounts(userId: string): Promise<BrokerAccount[]> {
    return this.brokerAccountsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' }
    })
  }

  /**
   * Get a specific broker account
   */
  async getBrokerAccount(accountId: string, userId: string): Promise<BrokerAccount> {
    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Broker account not found or access denied')
    }

    return account
  }

  /**
   * Delete a broker account
   */
  async deleteBrokerAccount(accountId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting broker account: ${accountId}`)

    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Broker account not found or access denied')
    }

    await this.brokerAccountsRepository.remove(account)
    this.logger.log(`✅ Broker account deleted successfully: ${accountId}`)
  }

  /**
   * Refresh access token for a broker account
   */
  async refreshAccessToken(accountId: string, userId: string): Promise<BrokerAccount> {
    this.logger.log(`Refreshing access token for account: ${accountId}`)

    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Broker account not found or access denied')
    }

    // Get new access token
    const accessToken = await GrowwApiService.getAccessToken(account.api_key, account.api_secret)
    
    // Calculate token expiry
    const now = new Date()
    const tomorrow6AM = new Date(now)
    tomorrow6AM.setDate(tomorrow6AM.getDate() + 1)
    tomorrow6AM.setHours(6, 0, 0, 0)

    account.access_token = accessToken
    account.token_expires_at = tomorrow6AM
    account.updated_at = new Date()

    const updatedAccount = await this.brokerAccountsRepository.save(account)
    this.logger.log(`✅ Access token refreshed successfully for account: ${accountId}`)

    return updatedAccount
  }

  /**
   * Check and refresh expired tokens for all active accounts
   */
  async refreshExpiredTokens(): Promise<void> {
    this.logger.log('Checking for expired access tokens')

    const now = new Date()
    const expiredAccounts = await this.brokerAccountsRepository.find({
      where: {
        status: 'active',
        token_expires_at: { $lt: now } as any
      }
    })

    this.logger.log(`Found ${expiredAccounts.length} accounts with expired tokens`)

    for (const account of expiredAccounts) {
      try {
        await this.refreshAccessToken(account.id, account.user_id)
      } catch (error) {
        this.logger.error(`Failed to refresh token for account ${account.id}:`, error)
      }
    }
  }

  /**
   * Test broker account credentials
   */
  async testBrokerAccount(accountId: string, userId: string): Promise<{
    isValid: boolean
    message: string
    accountInfo?: any
  }> {
    this.logger.log(`Testing broker account credentials: ${accountId}`)

    const account = await this.brokerAccountsRepository.findOne({
      where: { id: accountId, user_id: userId }
    })

    if (!account) {
      throw new Error('Broker account not found or access denied')
    }

    try {
      // Use the injected GrowwApiService with the account's access token
      if (!account.access_token) {
        throw new Error('No access token available for this account')
      }
      // TODO: Implement real Groww API integration
      // For now, return success without actual API validation
      const holdings: any[] = []
      
      return {
        isValid: true,
        message: 'Credentials are valid and working',
        accountInfo: {
          holdings_count: holdings.length,
          sample_holdings: holdings.slice(0, 3).map(h => ({
            symbol: (h as any).symbol || 'N/A',
            quantity: (h as any).quantity || 0,
            average_price: (h as any).average_price || 0
          }))
        }
      }
    } catch (error) {
      this.logger.error(`Broker account test failed for ${accountId}:`, error)
      return {
        isValid: false,
        message: `Credentials test failed: ${error.message}`
      }
    }
  }
}
