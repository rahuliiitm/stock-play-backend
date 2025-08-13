import { Body, Controller, Get, Param, Post, Query, Patch, UseGuards } from '@nestjs/common'
import { ContestsService } from './contests.service'
import { CreateContestDto } from './dto/create-contest.dto'
import { UpdateContestDto } from './dto/update-contest.dto'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { QuotesService } from '../stocks/quotes.service'
import { IndicatorsService } from '../stocks/indicators.service'

@Controller('contests')
export class ContestsController {
  constructor(
    private readonly contests: ContestsService,
    private readonly quotes: QuotesService,
    private readonly indicators: IndicatorsService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.contests.list(status)
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const contest = await this.contests.get(id)
    const participantCount = await this.contests.countParticipants(id)
    const symbol = (contest.allowed_symbols && contest.allowed_symbols[0]) || 'NIFTY'
    const [quote, candles] = await Promise.all([
      this.quotes.getQuote(symbol),
      this.quotes.getHistory(symbol),
    ])
    const inds = {
      rsi: this.indicators.rsi(candles as any),
      ma20: this.indicators.ma(candles as any, 20),
      macd: this.indicators.macd(candles as any),
    }
    return { ...contest, participantCount, primarySymbol: symbol, currentQuote: quote, chart: { candles }, indicators: inds }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateContestDto) {
    return this.contests.update(id, body as any)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() body: CreateContestDto) {
    const input = {
      name: body.name,
      slug: body.slug ?? body.name.toLowerCase().replace(/\s+/g, '-'),
      description: body.description ?? null,
      visibility: body.visibility ?? 'public',
      initial_balance_cents: body.initial_balance_cents,
      entry_fee_cents: body.entry_fee_cents ?? 0,
      max_participants: body.max_participants ?? null,
      starts_at: new Date(body.starts_at),
      ends_at: new Date(body.ends_at),
      allowed_symbols: body.allowed_symbols ?? null,
      currency: 'INR',
      status: 'draft',
      created_by_user_id: '00000000-0000-0000-0000-000000000000',
    }
    return this.contests.create(input as any)
  }
} 