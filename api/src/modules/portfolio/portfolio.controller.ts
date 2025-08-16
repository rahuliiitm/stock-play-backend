import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common'
import { PortfolioService } from './portfolio.service'
import { JwtAuthGuard } from '../auth/jwt.guard'

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':contestId/current')
  current(@Req() req: any, @Param('contestId') contestId: string) {
    return this.svc.getCurrentPortfolio(req.user.sub, contestId)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':contestId/add-stock')
  addStock(@Req() req: any, @Param('contestId') contestId: string, @Body() body: { symbol: string; quantity: number }) {
    return this.svc.addStockToPortfolio(req.user.sub, contestId, body.symbol, body.quantity)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':contestId/remove-stock')
  removeStock(@Req() req: any, @Param('contestId') contestId: string, @Body() body: { symbol: string }) {
    return this.svc.removeStockFromPortfolio(req.user.sub, contestId, body.symbol)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':contestId/rebalance')
  rebalance(@Req() req: any, @Param('contestId') contestId: string, @Body() body: { updates: Array<{ symbol: string; quantity: number }> }) {
    return this.svc.rebalancePortfolio(req.user.sub, contestId, body.updates)
  }
} 