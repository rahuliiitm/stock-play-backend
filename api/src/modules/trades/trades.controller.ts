import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { TradesService } from './trades.service'
import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator'

class PlaceTradeDto {
  @IsString()
  symbol!: string

  @IsEnum(['BUY', 'SELL'] as any)
  side!: 'BUY' | 'SELL'

  @IsNumber()
  @IsPositive()
  quantity!: number
}

@Controller()
export class TradesController {
  constructor(private readonly svc: TradesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('contests/:id/trades')
  place(@Param('id') id: string, @Req() req: any, @Body() body: PlaceTradeDto) {
    return this.svc.placeTrade({ contestId: id, userId: req.user.sub, symbol: body.symbol, side: body.side, quantity: body.quantity })
  }

  @UseGuards(JwtAuthGuard)
  @Get('contests/:id/trades')
  list(@Param('id') id: string, @Req() req: any) {
    return this.svc.listMyTrades(id, req.user.sub)
  }
} 