import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GrowwApiService } from '../services/groww-api.service';
import { OrderService } from '../services/order.service';
import type { GrowwCredentials } from '../services/groww-api.service';
import type {
  OrderPlacementRequest,
  OrderModificationRequest,
} from '../services/order.service';

@Controller('broker')
export class BrokerController {
  constructor(
    private growwApiService: GrowwApiService,
    private orderService: OrderService,
  ) {}

  /**
   * Authenticate with broker
   */
  @Post('auth')
  async authenticate(
    @Body() credentials: GrowwCredentials,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.growwApiService.authenticate(credentials);

      if (success) {
        return {
          success: true,
          message: 'Authentication successful',
        };
      } else {
        return {
          success: false,
          message: 'Authentication failed',
        };
      }
    } catch (error) {
      throw new HttpException(
        `Authentication failed: ${error.message}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Test broker connectivity
   */
  @Get('connectivity')
  async testConnectivity(): Promise<{ connected: boolean; message: string }> {
    try {
      const connected = await this.growwApiService.testConnectivity();
      return {
        connected,
        message: connected
          ? 'Broker connection successful'
          : 'Broker connection failed',
      };
    } catch (error) {
      return {
        connected: false,
        message: `Connectivity test failed: ${error.message}`,
      };
    }
  }

  /**
   * Get account information
   */
  @Get('account')
  async getAccountInfo(): Promise<any> {
    try {
      const margins = await this.growwApiService.getMargins();
      const holdings = await this.growwApiService.getHoldings();

      return {
        margins,
        holdings,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get account info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get positions
   */
  @Get('positions')
  async getPositions(): Promise<any> {
    try {
      const positions = await this.growwApiService.getPositions();
      return {
        positions,
        count: positions.length,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get positions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get holdings
   */
  @Get('holdings')
  async getHoldings(): Promise<any> {
    try {
      const holdings = await this.growwApiService.getHoldings();
      return {
        holdings,
        count: holdings.length,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get holdings: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get live quote for a symbol
   */
  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string): Promise<any> {
    try {
      const quote = await this.growwApiService.getQuote(symbol);
      return {
        symbol,
        quote,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get quote for ${symbol}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get historical data for backtesting
   */
  @Get('historical/:symbol')
  async getHistoricalData(
    @Param('symbol') symbol: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('interval') interval: string = '1D',
  ): Promise<any> {
    try {
      if (!fromDate || !toDate) {
        throw new Error('from and to dates are required');
      }

      const data = await this.growwApiService.getHistoricalData(
        symbol,
        fromDate,
        toDate,
        interval,
      );
      return {
        symbol,
        interval,
        data,
        count: data.length,
        fromDate,
        toDate,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get historical data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Place an order
   */
  @Post('orders')
  async placeOrder(@Body() orderRequest: OrderPlacementRequest): Promise<any> {
    try {
      const order = await this.orderService.placeOrder(orderRequest);
      return {
        success: true,
        order,
        message: 'Order placed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to place order: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Modify an order
   */
  @Put('orders/:orderId')
  async modifyOrder(
    @Param('orderId') orderId: string,
    @Body() modifications: OrderModificationRequest,
  ): Promise<any> {
    try {
      const order = await this.orderService.modifyOrder(orderId, modifications);
      return {
        success: true,
        order,
        message: 'Order modified successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to modify order: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Cancel an order
   */
  @Delete('orders/:orderId')
  async cancelOrder(@Param('orderId') orderId: string): Promise<any> {
    try {
      const order = await this.orderService.cancelOrder(orderId);
      return {
        success: true,
        order,
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to cancel order: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get order details
   */
  @Get('orders/:orderId')
  async getOrder(@Param('orderId') orderId: string): Promise<any> {
    try {
      const order = await this.orderService.getOrder(orderId);
      return {
        order,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get order: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Get all orders for a strategy
   */
  @Get('strategies/:strategyId/orders')
  async getOrdersForStrategy(
    @Param('strategyId') strategyId: string,
    @Query('status') status?: string,
  ): Promise<any> {
    try {
      const orders = await this.orderService.getOrdersForStrategy(
        strategyId,
        status,
      );
      return {
        strategyId,
        orders,
        count: orders.length,
        filter: status || 'all',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get orders: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync order status with broker
   */
  @Post('orders/:orderId/sync')
  async syncOrderStatus(@Param('orderId') orderId: string): Promise<any> {
    try {
      const order = await this.orderService.syncOrderStatus(orderId);
      return {
        success: true,
        order,
        message: 'Order status synced successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to sync order status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync all orders for a strategy
   */
  @Post('strategies/:strategyId/orders/sync')
  async syncAllOrdersForStrategy(
    @Param('strategyId') strategyId: string,
  ): Promise<any> {
    try {
      const orders =
        await this.orderService.syncAllOrdersForStrategy(strategyId);
      return {
        success: true,
        strategyId,
        syncedOrders: orders.length,
        orders,
        message: 'All orders synced successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to sync orders: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get order statistics for a strategy
   */
  @Get('strategies/:strategyId/orders/stats')
  async getOrderStatistics(
    @Param('strategyId') strategyId: string,
  ): Promise<any> {
    try {
      const stats = await this.orderService.getOrderStatistics(strategyId);
      return {
        strategyId,
        statistics: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get order statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get pending orders count
   */
  @Get('strategies/:strategyId/orders/pending/count')
  async getPendingOrdersCount(
    @Param('strategyId') strategyId: string,
  ): Promise<any> {
    try {
      const count = await this.orderService.getPendingOrdersCount(strategyId);
      return {
        strategyId,
        pendingOrdersCount: count,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get pending orders count: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get broker orders (all orders from broker)
   */
  @Get('orders')
  async getBrokerOrders(@Query('status') status?: string): Promise<any> {
    try {
      const orders = await this.growwApiService.getOrders(status);
      return {
        orders,
        count: orders.length,
        filter: status || 'all',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get broker orders: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get rate limit status
   */
  @Get('rate-limit')
  async getRateLimitStatus(): Promise<any> {
    try {
      const status = await this.growwApiService.getRateLimitStatus();
      return {
        rateLimit: status,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get rate limit status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
