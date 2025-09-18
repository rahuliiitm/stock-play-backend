import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common'
import { PortfolioServiceV2 } from './portfolio-v2.service'
import { HoldingsService } from './holdings.service'
import { TransactionsService } from './transactions.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { TransactionType } from '../../entities/PortfolioTransactionV2.entity'
import { PortfolioValueUpdateService } from './portfolio-value-update.service'
import { StrategyRunnerService } from '../strategy/services/strategy-runner.service'
import { StrategyConfig } from '../strategy/interfaces/strategy-config.interface'
import { Strategy } from '../strategy/entities/strategy.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

class CreatePortfolioDto {
  name!: string
  visibility!: 'public' | 'unlisted' | 'private'
}

class UpdatePortfolioDto {
  name?: string
  visibility?: 'public' | 'unlisted' | 'private'
}

class AddStockDto {
  symbol!: string
  quantity!: number
  exchange?: 'NSE' | 'BSE'
}

class RemoveStockDto {
  symbol!: string
  quantity?: number
}

class CreateTransactionDto {
  symbol?: string
  exchange?: 'NSE' | 'BSE'
  quantityDelta?: number
  price?: number
  fees?: number
  type!: TransactionType
}

@Controller('v2/portfolios')
@UseGuards(JwtAuthGuard)
export class PortfolioV2Controller {
  constructor(
    private readonly portfolioService: PortfolioServiceV2,
    private readonly holdingsService: HoldingsService,
    private readonly transactionsService: TransactionsService,
    private readonly portfolioValueUpdate: PortfolioValueUpdateService,
    private readonly strategyRunnerService: StrategyRunnerService,
    @InjectRepository(Strategy)
    private readonly strategyRepository: Repository<Strategy>,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPortfolio(@Req() req: any, @Body() dto: CreatePortfolioDto) {
    const portfolio = await this.portfolioService.createPortfolio(req.user.sub, dto.name, dto.visibility)
    return {
      id: portfolio.id,
      name: portfolio.name,
      visibility: portfolio.visibility,
      createdAt: portfolio.created_at,
    }
  }

  @Get()
  async getUserPortfolios(@Req() req: any) {
    return this.portfolioService.getUserPortfolios(req.user.sub)
  }

  @Get(':portfolioId')
  async getPortfolio(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    // Check if user owns the portfolio
    const portfolio = await this.portfolioService.getUserPortfolios(req.user.sub)
    const userPortfolio = portfolio.find(p => p.id === portfolioId)

    if (!userPortfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    return userPortfolio
  }

  @Put(':portfolioId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePortfolio(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    // For now, we'll implement a simple update in the service
    // This would require adding an update method to PortfolioServiceV2
    throw new HttpException('Update portfolio not yet implemented', HttpStatus.NOT_IMPLEMENTED)
  }

  @Delete(':portfolioId')
  async deletePortfolio(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    const result = await this.portfolioService.deletePortfolio(portfolioId)
    if (!result.ok) {
      throw new HttpException(result.message || 'Failed to delete portfolio', HttpStatus.BAD_REQUEST)
    }
    return { message: 'Portfolio deleted successfully' }
  }

  // Holdings endpoints
  @Get(':portfolioId/holdings')
  async getPortfolioHoldings(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    return this.holdingsService.getPortfolioHoldings(portfolioId)
  }

  @Get(':portfolioId/holdings/:symbol')
  async getHolding(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Param('symbol') symbol: string,
  ) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const holding = await this.holdingsService.getHolding(portfolioId, symbol)
    if (!holding) {
      throw new HttpException('Holding not found', HttpStatus.NOT_FOUND)
    }

    return holding
  }

  // Stock management endpoints
  @Post(':portfolioId/stocks')
  @UsePipes(new ValidationPipe({ transform: true }))
  async addStock(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: AddStockDto,
  ) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const result = await this.portfolioService.addStockToPortfolio(
      portfolioId,
      dto.symbol,
      dto.quantity,
      dto.exchange || 'NSE',
    )

    if (!result.ok) {
      throw new HttpException(result.message || 'Failed to add stock', HttpStatus.BAD_REQUEST)
    }

    return { message: 'Stock added successfully' }
  }

  @Delete(':portfolioId/stocks/:symbol')
  @UsePipes(new ValidationPipe({ transform: true }))
  async removeStock(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Param('symbol') symbol: string,
    @Body() dto: RemoveStockDto,
  ) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const result = await this.portfolioService.removeStockFromPortfolio(portfolioId, symbol, dto.quantity)

    if (!result.ok) {
      throw new HttpException(result.message || 'Failed to remove stock', HttpStatus.BAD_REQUEST)
    }

    return { message: 'Stock removed successfully' }
  }

  // Transactions endpoints
  @Get(':portfolioId/transactions')
  async getPortfolioTransactions(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Query() query: any,
  ) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const filter = {
      type: query.type,
      symbol: query.symbol,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    }

    return this.transactionsService.getPortfolioTransactions(portfolioId, filter)
  }

  @Post(':portfolioId/transactions')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTransaction(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const transaction = await this.transactionsService.createTransaction(
      portfolioId,
      dto.symbol || null,
      dto.exchange || null,
      dto.quantityDelta || null,
      dto.price || null,
      dto.fees || null,
      dto.type,
    )

    return {
      id: transaction.id,
      portfolioId: transaction.portfolio_id,
      symbol: transaction.symbol,
      exchange: transaction.exchange,
      quantityDelta: transaction.quantity_delta ? Number(transaction.quantity_delta) : null,
      price: transaction.price,
      fees: transaction.fees,
      type: transaction.type,
      createdAt: transaction.created_at,
    }
  }

  @Get(':portfolioId/transactions/summary')
  async getTransactionSummary(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    return this.transactionsService.getPortfolioTransactionSummary(portfolioId)
  }

  // Portfolio metrics endpoint
  @Get(':portfolioId/metrics')
  async getPortfolioMetrics(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    return this.portfolioService.getPortfolioMetrics(portfolioId)
  }

  @Post(':portfolioId/update-value')
  @UseGuards(JwtAuthGuard)
  async updatePortfolioValue(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
  ) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    await this.portfolioValueUpdate.updatePortfolioValue(portfolioId)
    return { message: 'Portfolio value updated successfully' }
  }

  @Post('update-all-values')
  @UseGuards(JwtAuthGuard)
  async updateAllPortfolioValues(@Req() req: any) {
    // Only allow admin users to update all portfolios
    if (req.user.role !== 'admin') {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN)
    }

    await this.portfolioValueUpdate.updateAllPortfolioValues()
    return { message: 'All portfolio values updated successfully' }
  }

  @Post('update-public-values')
  @UseGuards(JwtAuthGuard)
  async updatePublicPortfolioValues(@Req() req: any) {
    // Only allow admin users to update public portfolios
    if (req.user.role !== 'admin') {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN)
    }

    await this.portfolioValueUpdate.updatePublicPortfolioValues()
    return { message: 'Public portfolio values updated successfully' }
  }

  // Automation endpoints
  @Post(':portfolioId/automation/start')
  async startStrategy(
    @Req() req: any,
    @Param('portfolioId') portfolioId: string,
    @Query('symbol') symbol: string,
  ) {
    if (!symbol) {
      throw new HttpException('Symbol is required to start a strategy', HttpStatus.BAD_REQUEST)
    }

    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    // Generate a simple SMA crossover strategy for the given symbol
    const strategyConfig: StrategyConfig = {
      id: `sma-crossover-${portfolioId}-${symbol}`,
      name: `SMA Crossover for ${symbol} (${portfolio.name})`,
      description: `Automated SMA 50/200 crossover strategy for portfolio ${portfolioId}`,
      underlyingSymbol: symbol,
      timeframe: '1D',
      maxConcurrentPositions: 1,
      riskManagement: {
        maxLossPerTrade: 0.02, // 2% of position value
        maxDailyLoss: 0.05, // 5% of portfolio value
        maxDrawdown: 0.10, // 10% of portfolio value
        positionSizePercent: 0.10, // 10% of available capital
      },
      indicators: [
        {
          name: 'sma50',
          type: 'SMA',
          parameters: { period: 50 },
          timeframe: '1D',
        },
        {
          name: 'sma200',
          type: 'SMA',
          parameters: { period: 200 },
          timeframe: '1D',
        },
      ],
      entryConditions: [
        {
          id: 'sma-crossover-buy',
          name: 'SMA 50 crosses above SMA 200',
          type: 'PARALLEL',
          conditions: [
            {
              type: 'INDICATOR_COMPARISON',
              operator: 'GT',
              leftOperand: 'sma50',
              rightOperand: 'sma200',
            },
          ],
        },
      ],
      exitConditions: [
        {
          id: 'sma-crossover-sell',
          name: 'SMA 50 crosses below SMA 200',
          type: 'SIGNAL_BASED',
          condition: {
            type: 'INDICATOR_COMPARISON',
            operator: 'LT',
            leftOperand: 'sma50',
            rightOperand: 'sma200',
          },
          priority: 1,
        },
        {
          id: 'stop-loss',
          name: 'Stop Loss',
          type: 'STOP_LOSS',
          condition: {
            type: 'PRICE_CONDITION',
            operator: 'LT',
            leftOperand: 'current_price',
            rightOperand: 'entry_price * (1 - riskManagement.maxLossPerTrade)',
          },
          priority: 2,
        },
      ],
      orderConfig: {
        orderType: 'MARKET',
        quantity: 1, // Placeholder, should be calculated based on positionSizePercent
        productType: 'CNC',
      },
    }

    // Save the strategy to the database
    let strategy = await this.strategyRepository.findOne({ where: { id: strategyConfig.id } })
    if (strategy) {
      // Update existing strategy
      strategy.config = strategyConfig
      strategy.isActive = true
      await this.strategyRepository.save(strategy)
    } else {
      // Create new strategy
      strategy = this.strategyRepository.create({
        id: strategyConfig.id,
        name: strategyConfig.name,
        description: strategyConfig.description,
        isActive: true,
        configType: 'RULE_BASED',
        underlyingSymbol: strategyConfig.underlyingSymbol,
        assetType: 'STOCK',
        timeframe: strategyConfig.timeframe as any,
        config: strategyConfig,
        riskManagement: strategyConfig.riskManagement,
      })
      await this.strategyRepository.save(strategy)
    }

    // Start the strategy runner
    const started = await this.strategyRunnerService.startStrategy(strategyConfig)

    if (started) {
      return { success: true, message: `Strategy ${strategyConfig.id} started`, strategyId: strategyConfig.id }
    } else {
      throw new HttpException(`Failed to start strategy ${strategyConfig.id}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post(':portfolioId/automation/stop')
  async stopStrategy(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    // Assuming strategy ID is derived from portfolio ID
    const strategyId = `sma-crossover-${portfolioId}-RELIANCE` // Need to make this dynamic
    const stopped = await this.strategyRunnerService.stopStrategy(strategyId)

    if (stopped) {
      // Mark strategy as inactive in DB
      const strategy = await this.strategyRepository.findOne({ where: { id: strategyId } })
      if (strategy) {
        strategy.isActive = false
        await this.strategyRepository.save(strategy)
      }
      return { success: true, message: `Strategy ${strategyId} stopped`, strategyId }
    } else {
      throw new HttpException(`Failed to stop strategy ${strategyId}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':portfolioId/automation/status')
  async getStrategyStatus(@Req() req: any, @Param('portfolioId') portfolioId: string) {
    // Check if user owns the portfolio
    const portfolios = await this.portfolioService.getUserPortfolios(req.user.sub)
    const portfolio = portfolios.find(p => p.id === portfolioId)

    if (!portfolio) {
      throw new HttpException('Portfolio not found', HttpStatus.NOT_FOUND)
    }

    const strategyId = `sma-crossover-${portfolioId}-RELIANCE` // Need to make this dynamic
    const status = this.strategyRunnerService.getStrategyStatus(strategyId)
    return { success: true, status, strategyId }
  }
}

