import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { BrokerService } from './broker.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

class LinkGrowwAccountDto {
  accountId!: string;
  accountName!: string;
  accessToken!: string;
  refreshToken?: string;
  expiresAt?: string;
}

class SyncBrokerAccountDto {
  accountId!: string;
}

@Controller('broker')
@UseGuards(JwtAuthGuard)
export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  @Post('groww/link')
  @UsePipes(new ValidationPipe({ transform: true }))
  async linkGrowwAccount(@Req() req: any, @Body() dto: LinkGrowwAccountDto) {
    try {
      const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

      const account = await this.brokerService.linkGrowwAccount(
        req.user.sub,
        dto.accountId,
        dto.accountName,
        dto.accessToken,
        dto.refreshToken,
        expiresAt,
      );

      return {
        success: true,
        account: {
          id: account.id,
          broker: account.broker,
          accountId: account.account_id,
          accountName: account.account_name,
          status: account.status,
          createdAt: account.created_at,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to link Groww account',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('groww/unlink/:accountId')
  async unlinkGrowwAccount(
    @Req() req: any,
    @Param('accountId') accountId: string,
  ) {
    try {
      const success = await this.brokerService.unlinkGrowwAccount(
        req.user.sub,
        accountId,
      );

      if (!success) {
        throw new HttpException(
          'Broker account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'Groww account unlinked successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unlink Groww account',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('accounts')
  async getUserBrokerAccounts(@Req() req: any) {
    try {
      const accounts = await this.brokerService.getUserBrokerAccounts(
        req.user.sub,
      );

      return {
        success: true,
        accounts: accounts.map((account) => ({
          id: account.id,
          broker: account.broker,
          accountId: account.account_id,
          accountName: account.account_name,
          status: account.status,
          lastSyncAt: account.last_sync_at,
          lastSyncError: account.last_sync_error,
          createdAt: account.created_at,
        })),
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch broker accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('accounts/:accountId')
  async getBrokerAccount(
    @Req() req: any,
    @Param('accountId') accountId: string,
  ) {
    try {
      const account = await this.brokerService.getBrokerAccount(accountId);

      if (!account || account.user_id !== req.user.sub) {
        throw new HttpException(
          'Broker account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        account: {
          id: account.id,
          broker: account.broker,
          accountId: account.account_id,
          accountName: account.account_name,
          status: account.status,
          lastSyncAt: account.last_sync_at,
          lastSyncError: account.last_sync_error,
          createdAt: account.created_at,
          metadata: account.metadata,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch broker account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('accounts/:accountId/sync')
  @UsePipes(new ValidationPipe({ transform: true }))
  async syncBrokerAccount(
    @Req() req: any,
    @Param('accountId') accountId: string,
  ) {
    try {
      // First verify the account belongs to the user
      const account = await this.brokerService.getBrokerAccount(accountId);

      if (!account || account.user_id !== req.user.sub) {
        throw new HttpException(
          'Broker account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Perform sync based on broker type
      let result;
      if (account.broker === 'groww') {
        result = await this.brokerService.syncGrowwHoldings(
          req.user.sub,
          account.account_id,
        );
      } else {
        throw new HttpException(
          'Unsupported broker type',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: result.success,
        holdingsCount: result.holdingsCount,
        syncedAt: result.syncedAt,
        error: result.error,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to sync broker account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('accounts/:accountId/status')
  async getBrokerAccountStatus(
    @Req() req: any,
    @Param('accountId') accountId: string,
  ) {
    try {
      // First verify the account belongs to the user
      const account = await this.brokerService.getBrokerAccount(accountId);

      if (!account || account.user_id !== req.user.sub) {
        throw new HttpException(
          'Broker account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const status = await this.brokerService.getBrokerAccountStatus(accountId);

      return {
        success: true,
        ...status,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to get broker account status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // OAuth flow endpoints (for future implementation)
  @Get('groww/auth-url')
  async getGrowwAuthUrl(@Req() req: any) {
    // TODO: Implement OAuth URL generation for Groww
    // This would generate the authorization URL for Groww OAuth flow

    const clientId = process.env.GROWW_CLIENT_ID;
    const redirectUri =
      process.env.GROWW_REDIRECT_URI ||
      `${process.env.APP_URL}/auth/groww/callback`;

    if (!clientId) {
      throw new HttpException(
        'Groww OAuth not configured',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    // Placeholder response - actual implementation would generate proper OAuth URL
    return {
      success: true,
      authUrl: `https://groww.in/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=holdings`,
      state: req.user.sub, // Include user ID for verification
    };
  }

  @Post('groww/callback')
  async handleGrowwCallback(
    @Req() req: any,
    @Body() body: { code: string; state: string },
  ) {
    // TODO: Implement OAuth callback handling
    // This would exchange the authorization code for access/refresh tokens
    // and link the broker account

    throw new HttpException(
      'Groww OAuth callback not yet implemented',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  // Groww API endpoints
  @Get('groww/orders/:accountId')
  async getGrowwOrders(@Req() req: any, @Param('accountId') accountId: string) {
    try {
      const orders = await this.brokerService.getGrowwOrders(
        req.user.sub,
        accountId,
      );
      return { success: true, orders };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch Groww orders',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('groww/margin/:accountId')
  async getGrowwMargin(@Req() req: any, @Param('accountId') accountId: string) {
    try {
      const margin = await this.brokerService.getGrowwMargin(
        req.user.sub,
        accountId,
      );
      return { success: true, margin };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch Groww margin',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Public endpoint for instrument search (no auth required)
  @Get('groww/instruments/search')
  async searchGrowwInstruments(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return { results: [] };
    }

    try {
      const instruments =
        await this.brokerService.searchGrowwInstruments(query);
      return { success: true, results: instruments };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to search instruments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
