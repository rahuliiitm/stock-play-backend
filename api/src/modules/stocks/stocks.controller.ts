import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common'
import { QuotesService } from './quotes.service'
import { IndicatorsService } from './indicators.service'
import { SymbolsService } from './symbols.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('stocks')
export class StocksController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly indicators: IndicatorsService,
    private readonly symbols: SymbolsService,
  ) {}

  @Get('search')
  search(@Query('q') q: string) { return this.quotes.search(q) }

  @Get('symbols')
  listSymbols(@Query('q') q?: string, @Query('exchange') exchange?: string) { return this.symbols.list(q, exchange) }

  @Get('symbols/:symbol')
  getSymbol(@Param('symbol') symbol: string) { return this.symbols.get(symbol) }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/sync-symbols')
  syncSymbols(@Body() body: { nseUrl?: string; bseUrl?: string }) { return this.symbols.sync(body.nseUrl, body.bseUrl) }

  @Get(':symbol/quote')
  quote(@Param('symbol') symbol: string) { return this.quotes.getQuote(symbol) }

  @Get(':symbol/history')
  history(@Param('symbol') symbol: string, @Query('from') from?: string, @Query('to') to?: string, @Query('intervalMinutes') intervalMinutes?: string) {
    const minutes = intervalMinutes ? Number(intervalMinutes) : undefined
    return this.quotes.getHistory(symbol, from, to, minutes)
  }

  @Get(':symbol/indicators')
  async indicatorsEndpoint(@Param('symbol') symbol: string) {
    const candles = await this.quotes.getHistory(symbol)
    return { rsi: this.indicators.rsi(candles as any), ma20: this.indicators.ma(candles as any, 20), macd: this.indicators.macd(candles as any) }
  }
} 