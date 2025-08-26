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
  priceCents?: number
  feesCents?: number
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
      dto.priceCents || null,
      dto.feesCents || null,
      dto.type,
    )

    return {
      id: transaction.id,
      portfolioId: transaction.portfolio_id,
      symbol: transaction.symbol,
      exchange: transaction.exchange,
      quantityDelta: transaction.quantity_delta ? Number(transaction.quantity_delta) : null,
      priceCents: transaction.price_cents,
      feesCents: transaction.fees_cents,
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
}

