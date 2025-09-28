import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerAccount } from '../../entities/BrokerAccount.entity';
import { BrokerToken } from '../../entities/BrokerToken.entity';
import { GrowwApiService } from '../broker/services/groww-api.service';

export interface BrokerSyncResult {
  success: boolean;
  holdingsCount: number;
  error?: string;
  syncedAt: Date;
}

@Injectable()
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name);

  constructor(
    @InjectRepository(BrokerAccount)
    private readonly brokerAccounts: Repository<BrokerAccount>,
    @InjectRepository(BrokerToken)
    private readonly brokerTokens: Repository<BrokerToken>,
    private readonly growwApiService: GrowwApiService,
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
    });

    if (account) {
      // Update existing account
      account.account_name = accountName;
      account.status = 'active';
      account.last_sync_error = undefined;
      account = await this.brokerAccounts.save(account);
    } else {
      // Create new account
      account = this.brokerAccounts.create({
        user_id: userId,
        broker: 'groww',
        account_id: accountId,
        account_name: accountName,
        status: 'active',
      });
      account = await this.brokerAccounts.save(account);
    }

    // Store tokens
    await this.storeToken(account.id, 'access', accessToken, expiresAt);
    if (refreshToken) {
      await this.storeToken(account.id, 'refresh', refreshToken);
    }

    return account;
  }

  async unlinkGrowwAccount(
    userId: string,
    accountId: string,
  ): Promise<boolean> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    });

    if (!account) {
      return false;
    }

    // Delete tokens first (cascade delete)
    await this.brokerTokens.delete({ broker_account_id: account.id });

    // Delete account
    await this.brokerAccounts.remove(account);

    return true;
  }

  async getUserBrokerAccounts(userId: string): Promise<BrokerAccount[]> {
    return this.brokerAccounts.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async getBrokerAccount(accountId: string): Promise<BrokerAccount | null> {
    return this.brokerAccounts.findOne({
      where: { id: accountId },
      relations: ['tokens'],
    });
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
    });

    if (token) {
      // Update existing token
      token.token_value = tokenValue;
      token.expires_at = expiresAt || null;
      token.updated_at = new Date();
    } else {
      // Create new token
      token = this.brokerTokens.create({
        broker_account_id: brokerAccountId,
        token_type: tokenType,
        token_value: tokenValue,
        expires_at: expiresAt || null,
      });
    }

    return this.brokerTokens.save(token);
  }

  async getValidAccessToken(brokerAccountId: string): Promise<string | null> {
    const accessToken = await this.brokerTokens.findOne({
      where: { broker_account_id: brokerAccountId, token_type: 'access' },
    });

    if (!accessToken) return null;

    // Check if token is expired
    if (accessToken.expires_at && accessToken.expires_at <= new Date())
      return null;

    return accessToken.token_value;
  }

  async refreshGrowwToken(brokerAccountId: string): Promise<boolean> {
    try {
      // Note: growwapi handles authentication internally
      // We just need to ensure the token is valid
      this.logger.log(
        `Groww token refresh not needed for account ${brokerAccountId} - handled by growwapi`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to refresh token for broker account ${brokerAccountId}:`,
        error,
      );
      return false;
    }
  }

  async syncGrowwHoldings(
    userId: string,
    accountId: string,
  ): Promise<BrokerSyncResult> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    });

    if (!account) {
      return {
        success: false,
        holdingsCount: 0,
        error: 'Broker account not found',
        syncedAt: new Date(),
      };
    }

    try {
      // Get access token
      let accessToken = await this.getValidAccessToken(account.id);

      if (!accessToken) {
        // Try to refresh token
        const refreshed = await this.refreshGrowwToken(account.id);
        if (!refreshed) {
          // Mark account as expired
          account.status = 'expired';
          await this.brokerAccounts.save(account);

          return {
            success: false,
            holdingsCount: 0,
            error: 'Access token expired and refresh failed',
            syncedAt: new Date(),
          };
        }

        // Get refreshed token
        accessToken = await this.getValidAccessToken(account.id);
        if (!accessToken) {
          return {
            success: false,
            holdingsCount: 0,
            error: 'Failed to get valid access token',
            syncedAt: new Date(),
          };
        }
      }

      // Fetch holdings from Groww
      const holdings = await this.fetchGrowwHoldings(accessToken);

      // TODO: Convert Groww holdings to internal portfolio format and save
      // For now, just return success with count

      // Update account status
      account.status = 'active';
      account.last_sync_at = new Date();
      account.last_sync_error = undefined;
      await this.brokerAccounts.save(account);

      return {
        success: true,
        holdingsCount: holdings.length,
        syncedAt: new Date(),
      };
    } catch (error) {
      // Update account with error
      account.status = 'error';
      account.last_sync_error = error.message || 'Unknown error';
      await this.brokerAccounts.save(account);

      return {
        success: false,
        holdingsCount: 0,
        error: error.message || 'Failed to sync holdings',
        syncedAt: new Date(),
      };
    }
  }

  private async fetchGrowwHoldings(accessToken: string): Promise<any[]> {
    // Use growwapi to fetch holdings
    try {
      const holdings = await this.growwApiService.getHoldings();
      return holdings || [];
    } catch (error) {
      this.logger.error('Failed to fetch holdings from Groww:', error);
      throw new Error(`Failed to fetch holdings: ${error.message}`);
    }
  }

  async getBrokerAccountStatus(accountId: string): Promise<{
    status: string;
    lastSyncAt: Date | null;
    lastSyncError: string | null;
  }> {
    const account = await this.getBrokerAccount(accountId);

    if (!account) {
      throw new Error('Broker account not found');
    }

    return {
      status: account.status,
      lastSyncAt: account.last_sync_at || null,
      lastSyncError: account.last_sync_error || null,
    };
  }

  // Additional Groww API methods
  async getGrowwOrders(userId: string, accountId: string): Promise<any[]> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    });

    if (!account) {
      throw new Error('Broker account not found');
    }

    // Use growwapi to get orders
    try {
      const orders = await this.growwApiService.getOrders();
      return orders || [];
    } catch (error) {
      this.logger.error('Failed to fetch orders from Groww:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  async getGrowwMargin(userId: string, accountId: string): Promise<any> {
    const account = await this.brokerAccounts.findOne({
      where: { user_id: userId, broker: 'groww', account_id: accountId },
    });

    if (!account) {
      throw new Error('Broker account not found');
    }

    // Use growwapi to get margin details
    try {
      const margin = await this.growwApiService.getMargins();
      return margin;
    } catch (error) {
      this.logger.error('Failed to fetch margin from Groww:', error);
      throw new Error(`Failed to fetch margin: ${error.message}`);
    }
  }

  async searchGrowwInstruments(query: string): Promise<any[]> {
    // Use growwapi to search instruments
    try {
      // TODO: Implement instrument search in GrowwApiService
      const instructions = []; // Placeholder until searchInstruments is implemented
      return instructions || [];
    } catch (error) {
      this.logger.error('Failed to search instruments from Groww:', error);
      throw new Error(`Failed to search instruments: ${error.message}`);
    }
  }
}
