import { Controller, Get, Param, Query } from '@nestjs/common'
import { QuotesService } from './quotes.service'
import { IndicatorsService } from './indicators.service'

@Controller('stocks')
export class StocksController {
  constructor(private readonly quotes: QuotesService, private readonly indicators: IndicatorsService) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.quotes.search(q)
  }

  @Get(':symbol/quote')
  quote(@Param('symbol') symbol: string) {
    return this.quotes.getQuote(symbol)
  }

  @Get(':symbol/history')
  history(
    @Param('symbol') symbol: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('intervalMinutes') intervalMinutes?: string,
  ) {
    const minutes = intervalMinutes ? Number(intervalMinutes) : undefined
    return this.quotes.getHistory(symbol, from, to, minutes)
  }

  @Get(':symbol/indicators')
  async indicatorsEndpoint(@Param('symbol') symbol: string) {
    const candles = await this.quotes.getHistory(symbol)
    return {
      rsi: this.indicators.rsi(candles as any),
      ma20: this.indicators.ma(candles as any, 20),
      macd: this.indicators.macd(candles as any),
    }
  }
} 