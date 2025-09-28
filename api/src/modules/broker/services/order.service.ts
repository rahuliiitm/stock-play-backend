import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategyOrder } from '../../strategy/entities/strategy-order.entity';
import { StrategyPosition } from '../../strategy/entities/strategy-position.entity';
import {
  GrowwApiService,
  GrowwOrder,
  GrowwOrderResponse,
} from './groww-api.service';
import { StrategyExecutionLog } from '../../strategy/entities/strategy-execution-log.entity';

export interface OrderPlacementRequest {
  strategyId: string;
  positionId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType:
    | 'MARKET'
    | 'LIMIT'
    | 'SL'
    | 'SL-M'
    | 'BO'
    | 'CO'
    | 'ICEBERG'
    | 'OCO';
  price?: number;
  triggerPrice?: number;
  productType: 'CNC' | 'MIS' | 'NRML';
  orderValidity?: 'DAY' | 'IOC' | 'GTD';
  disclosedQuantity?: number;
  metadata?: Record<string, any>;
}

export interface OrderModificationRequest {
  orderId: string;
  price?: number;
  quantity?: number;
  triggerPrice?: number;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    @InjectRepository(StrategyOrder)
    private orderRepository: Repository<StrategyOrder>,
    @InjectRepository(StrategyPosition)
    private positionRepository: Repository<StrategyPosition>,
    @InjectRepository(StrategyExecutionLog)
    private executionLogRepository: Repository<StrategyExecutionLog>,
    private growwApiService: GrowwApiService,
  ) {}

  /**
   * Place a new order
   */
  async placeOrder(request: OrderPlacementRequest): Promise<StrategyOrder> {
    const { strategyId, symbol, side, quantity, orderType, productType } =
      request;

    this.logger.log(
      `📋 Placing ${side} order for ${symbol} (Strategy: ${strategyId})`,
    );

    try {
      // Validate order parameters
      this.validateOrderRequest(request);

      // Create order record in database
      const orderRecord = this.orderRepository.create({
        strategyId,
        positionId: request.positionId,
        symbol,
        side,
        quantity,
        orderType,
        price: request.price,
        triggerPrice: request.triggerPrice,
        productType,
        orderValidity: request.orderValidity,
        disclosedQuantity: request.disclosedQuantity,
        orderParams: request.metadata,
        retryCount: 0,
      });

      const savedOrder = await this.orderRepository.save(orderRecord);

      // Convert to Groww API format
      const growwOrder: GrowwOrder = {
        symbol,
        side,
        quantity,
        orderType,
        productType,
        price: request.price,
        triggerPrice: request.triggerPrice,
        orderValidity: request.orderValidity,
        disclosedQuantity: request.disclosedQuantity,
      };

      // Place order with retry logic
      const growwResponse = await this.placeOrderWithRetry(
        growwOrder,
        savedOrder.id,
      );

      // Update order with broker response
      await this.updateOrderWithBrokerResponse(savedOrder.id, growwResponse);

      // Log successful order placement
      await this.executionLogRepository.save(
        StrategyExecutionLog.orderPlaced(strategyId, 'ENTRY', {
          orderId: savedOrder.id,
          symbol,
          side,
          quantity,
          orderType,
        }),
      );

      this.logger.log(`✅ Order placed successfully: ${savedOrder.id}`);
      const finalOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
      });
      if (!finalOrder) {
        throw new Error(`Order ${savedOrder.id} not found after creation`);
      }
      return finalOrder;
    } catch (error) {
      this.logger.error(`❌ Failed to place order:`, error.message);

      // Log failed order placement
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId,
          phase: 'ENTRY',
          action: 'ORDER_PLACED',
          success: false,
          errorMessage: error.message,
          details: { symbol, side, quantity, orderType },
        }),
      );

      throw error;
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(
    orderId: string,
    modifications: OrderModificationRequest,
  ): Promise<StrategyOrder> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (!order.brokerOrderId) {
        throw new Error(`Order ${orderId} has no broker order ID`);
      }

      // Can only modify pending orders
      if (order.status !== 'PENDING') {
        throw new Error(`Cannot modify order with status: ${order.status}`);
      }

      this.logger.log(`🔧 Modifying order ${orderId}`);

      // Prepare modification payload
      const modifyPayload: Partial<GrowwOrder> = {};
      if (modifications.price !== undefined)
        modifyPayload.price = modifications.price;
      if (modifications.quantity !== undefined)
        modifyPayload.quantity = modifications.quantity;
      if (modifications.triggerPrice !== undefined)
        modifyPayload.triggerPrice = modifications.triggerPrice;

      // Modify order with Groww API
      const growwResponse = await this.growwApiService.modifyOrder(
        order.brokerOrderId,
        modifyPayload,
      );

      // Update order in database
      const updates: Partial<StrategyOrder> = {
        updatedAt: new Date(),
      };

      if (modifications.price !== undefined)
        updates.price = modifications.price;
      if (modifications.quantity !== undefined)
        updates.quantity = modifications.quantity;
      if (modifications.triggerPrice !== undefined)
        updates.triggerPrice = modifications.triggerPrice;

      await this.orderRepository.update(orderId, updates);

      // Log modification
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId: order.strategyId,
          phase: 'ADJUSTMENT',
          action: 'ORDER_MODIFIED',
          details: {
            orderId,
            modifications,
            brokerResponse: growwResponse,
          },
        }),
      );

      const modifiedOrder = await this.orderRepository.findOne({
        where: { id: orderId },
      });
      if (!modifiedOrder) {
        throw new Error(`Order ${orderId} not found after modification`);
      }
      return modifiedOrder;
    } catch (error) {
      this.logger.error(`❌ Failed to modify order ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<StrategyOrder> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (!order.brokerOrderId) {
        throw new Error(`Order ${orderId} has no broker order ID`);
      }

      // Can only cancel pending orders
      if (order.status !== 'PENDING') {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      this.logger.log(`❌ Cancelling order ${orderId}`);

      // Cancel order with Groww API
      const growwResponse = await this.growwApiService.cancelOrder(
        order.brokerOrderId,
      );

      // Update order status
      await this.orderRepository.update(orderId, {
        status: 'CANCELLED',
        updatedAt: new Date(),
      });

      // Log cancellation
      await this.executionLogRepository.save(
        StrategyExecutionLog.createLog({
          strategyId: order.strategyId,
          phase: 'EXIT',
          action: 'ORDER_CANCELLED',
          details: {
            orderId,
            brokerResponse: growwResponse,
          },
        }),
      );

      const cancelledOrder = await this.orderRepository.findOne({
        where: { id: orderId },
      });
      if (!cancelledOrder) {
        throw new Error(`Order ${orderId} not found after cancellation`);
      }
      return cancelledOrder;
    } catch (error) {
      this.logger.error(`❌ Failed to cancel order ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<StrategyOrder> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['strategy', 'position'],
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * Get orders for a strategy
   */
  async getOrdersForStrategy(
    strategyId: string,
    status?: string,
  ): Promise<StrategyOrder[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .where('order.strategyId = :strategyId', { strategyId })
      .leftJoinAndSelect('order.position', 'position')
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    return query.getMany();
  }

  /**
   * Sync order status with broker
   */
  async syncOrderStatus(orderId: string): Promise<StrategyOrder> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order || !order.brokerOrderId) {
        throw new Error(`Order ${orderId} not found or has no broker order ID`);
      }

      // Get latest status from broker
      const brokerStatus = await this.growwApiService.getOrderStatus(
        order.brokerOrderId,
      );

      // Update order based on broker status
      const statusUpdate = this.mapBrokerStatusToOrderStatus(
        brokerStatus.status,
      );

      const updates: Partial<StrategyOrder> = {
        status: statusUpdate.status as any,
        brokerOrderStatus: brokerStatus.status,
        updatedAt: new Date(),
      };

      // Update execution details if order was executed
      if (statusUpdate.executed && brokerStatus.executedQuantity) {
        updates.executedQuantity = brokerStatus.executedQuantity;
        updates.executionPrice = brokerStatus.executionPrice;
      }

      await this.orderRepository.update(orderId, updates);

      // If order was executed, create/update position
      if (statusUpdate.executed && order.positionId) {
        await this.updatePositionOnExecution(order, brokerStatus);
      }

      const syncedOrder = await this.orderRepository.findOne({
        where: { id: orderId },
      });
      if (!syncedOrder) {
        throw new Error(`Order ${orderId} not found after sync`);
      }
      return syncedOrder;
    } catch (error) {
      this.logger.error(
        `❌ Failed to sync order ${orderId} status:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Sync all pending orders for a strategy
   */
  async syncAllOrdersForStrategy(strategyId: string): Promise<StrategyOrder[]> {
    const pendingOrders = await this.getOrdersForStrategy(
      strategyId,
      'PENDING',
    );

    const syncPromises = pendingOrders.map((order) =>
      this.syncOrderStatus(order.id).catch((error) => {
        this.logger.error(`Failed to sync order ${order.id}:`, error.message);
        return order; // Return original order if sync fails
      }),
    );

    return await Promise.all(syncPromises);
  }

  /**
   * Get pending orders count for a strategy
   */
  async getPendingOrdersCount(strategyId: string): Promise<number> {
    return await this.orderRepository.count({
      where: {
        strategyId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Validate order request
   */
  private validateOrderRequest(request: OrderPlacementRequest): void {
    const { symbol, side, quantity, orderType, productType } = request;

    if (!symbol || !side || !quantity || !orderType || !productType) {
      throw new Error('Missing required order parameters');
    }

    if (quantity <= 0) {
      throw new Error('Order quantity must be positive');
    }

    // Validate order type specific requirements
    if (orderType === 'LIMIT' && !request.price) {
      throw new Error('Limit orders require a price');
    }

    if ((orderType === 'SL' || orderType === 'SL-M') && !request.triggerPrice) {
      throw new Error('Stop loss orders require a trigger price');
    }

    if (
      orderType === 'ICEBERG' &&
      (!request.disclosedQuantity || request.disclosedQuantity >= quantity)
    ) {
      throw new Error(
        'Iceberg orders require disclosed quantity less than total quantity',
      );
    }
  }

  /**
   * Place order with retry logic
   */
  private async placeOrderWithRetry(
    growwOrder: GrowwOrder,
    orderId: string,
  ): Promise<GrowwOrderResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.growwApiService.placeOrder(growwOrder);

        // Update retry count on success
        if (attempt > 1) {
          await this.orderRepository.update(orderId, {
            retryCount: attempt - 1,
          });
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Increment retry count
        await this.orderRepository.update(orderId, {
          retryCount: attempt,
          errorMessage: error.message,
        });

        if (attempt < this.MAX_RETRIES) {
          this.logger.warn(
            `Order placement attempt ${attempt} failed, retrying in ${this.RETRY_DELAY}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw new Error(
      `Order placement failed after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Update order with broker response
   */
  private async updateOrderWithBrokerResponse(
    orderId: string,
    growwResponse: GrowwOrderResponse,
  ): Promise<void> {
    await this.orderRepository.update(orderId, {
      brokerOrderId: growwResponse.orderId,
      brokerOrderStatus: growwResponse.status,
      status: growwResponse.status === 'EXECUTED' ? 'EXECUTED' : 'PENDING',
      updatedAt: new Date(),
    });
  }

  /**
   * Map broker status to order status
   */
  private mapBrokerStatusToOrderStatus(brokerStatus: string): {
    status: string;
    executed: boolean;
  } {
    switch (brokerStatus.toUpperCase()) {
      case 'EXECUTED':
      case 'COMPLETE':
      case 'FILLED':
        return { status: 'EXECUTED', executed: true };
      case 'CANCELLED':
      case 'CANCELLED':
        return { status: 'CANCELLED', executed: false };
      case 'REJECTED':
        return { status: 'REJECTED', executed: false };
      case 'PARTIAL_FILL':
        return { status: 'PARTIAL_FILL', executed: true };
      default:
        return { status: 'PENDING', executed: false };
    }
  }

  /**
   * Update position when order is executed
   */
  private async updatePositionOnExecution(
    order: StrategyOrder,
    brokerStatus: any,
  ): Promise<void> {
    if (!order.positionId) return;

    const position = await this.positionRepository.findOne({
      where: { id: order.positionId },
    });
    if (!position) return;

    // Update position based on execution
    const updates: Partial<StrategyPosition> = {
      updatedAt: new Date(),
    };

    if (brokerStatus.executionPrice) {
      updates.currentPrice = brokerStatus.executionPrice;
    }

    if (brokerStatus.executedQuantity) {
      // This is a simplified position update - in reality you'd need more complex logic
      // to handle partial fills, averaging, etc.
      updates.quantity = brokerStatus.executedQuantity;
    }

    await this.positionRepository.update(position.id, updates);

    // Log position update
    await this.executionLogRepository.save(
      StrategyExecutionLog.positionUpdated(order.strategyId, 'ADJUSTMENT', {
        positionId: position.id,
        updates,
      }),
    );
  }

  /**
   * Get order statistics for a strategy
   */
  async getOrderStatistics(strategyId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    executedOrders: number;
    cancelledOrders: number;
    rejectedOrders: number;
    successRate: number;
  }> {
    const orders = await this.getOrdersForStrategy(strategyId);

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
      executedOrders: orders.filter(
        (o) => o.status === 'EXECUTED' || o.status === 'PARTIAL_FILL',
      ).length,
      cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
      rejectedOrders: orders.filter((o) => o.status === 'REJECTED').length,
      successRate: 0,
    };

    const completedOrders =
      stats.executedOrders + stats.cancelledOrders + stats.rejectedOrders;
    stats.successRate =
      completedOrders > 0 ? (stats.executedOrders / completedOrders) * 100 : 0;

    return stats;
  }
}
