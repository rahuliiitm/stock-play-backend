import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { Trade } from '../../entities/Trade.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { isMarketOpenIST } from '../../lib/time'
import { Contest } from '../../entities/Contest.entity'

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(Portfolio) private readonly portfolios: Repository<Portfolio>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(Trade) private readonly trades: Repository<Trade>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
    @InjectRepository(Contest) private readonly contests: Repository<Contest>,
  ) {}

  async listMyTrades(contestId: string, userId: string) {
    const participant = await this.participants.findOne({ where: { contest_id: contestId, user_id: userId } })
    if (!participant) throw new BadRequestException('Not joined')
    const portfolio = await this.portfolios.findOne({ where: { participant_id: participant.id } })
    return this.trades.find({ where: { portfolio_id: portfolio!.id }, order: { executed_at: 'DESC' } as any })
  }

  async placeTrade(input: { contestId: string; userId: string; symbol: string; side: 'BUY' | 'SELL'; quantity: number }) {
    if (input.quantity <= 0) throw new BadRequestException('Quantity must be positive')

    const contest = await this.contests.findOne({ where: { id: input.contestId } })
    if (!contest) throw new BadRequestException('Contest not found')
    const now = new Date()
    if (contest.status !== 'active') throw new BadRequestException('Contest not active')
    if (now < contest.starts_at || now > contest.ends_at) throw new BadRequestException('Outside contest window')
    if (!isMarketOpenIST(now)) throw new BadRequestException('Market closed (IST)')
    if (contest.allowed_symbols && contest.allowed_symbols.length > 0) {
      if (!contest.allowed_symbols.includes(input.symbol)) throw new BadRequestException('Symbol not allowed')
    }

    const participant = await this.participants.findOne({ where: { contest_id: input.contestId, user_id: input.userId } })
    if (!participant) throw new BadRequestException('Not joined')
    const portfolio = await this.portfolios.findOne({ where: { participant_id: participant.id } })
    if (!portfolio) throw new BadRequestException('Portfolio missing')

    // Mock price: 100.00
    const priceCents = 10000
    const notionalCents = Math.round(priceCents * input.quantity)

    if (input.side === 'BUY') {
      if (participant.current_cash_cents < notionalCents) throw new BadRequestException('Insufficient cash')
      participant.current_cash_cents -= notionalCents
      await this.participants.save(participant)

      let position = await this.positions.findOne({ where: { portfolio_id: portfolio.id, symbol: input.symbol } })
      if (!position) {
        position = this.positions.create({
          portfolio_id: portfolio.id,
          symbol: input.symbol,
          quantity: input.quantity.toFixed(4),
          avg_cost_cents: priceCents,
          open_value_cents: notionalCents,
          current_value_cents: notionalCents,
        })
      } else {
        const q = parseFloat(position.quantity)
        const newQty = q + input.quantity
        const newAvgCost = Math.round((q * position.avg_cost_cents + input.quantity * priceCents) / newQty)
        position.quantity = newQty.toFixed(4)
        position.avg_cost_cents = newAvgCost
        position.open_value_cents += notionalCents
        position.current_value_cents += notionalCents
      }
      await this.positions.save(position)
    } else {
      const position = await this.positions.findOne({ where: { portfolio_id: portfolio.id, symbol: input.symbol } })
      if (!position) throw new BadRequestException('No position')
      const q = parseFloat(position.quantity)
      if (input.quantity > q) throw new BadRequestException('Insufficient quantity')

      const sellValue = notionalCents
      participant.current_cash_cents += sellValue
      await this.participants.save(participant)

      const remaining = q - input.quantity
      position.quantity = remaining.toFixed(4)
      position.open_value_cents = Math.max(0, position.open_value_cents - notionalCents)
      position.current_value_cents = Math.max(0, position.current_value_cents - notionalCents)
      await this.positions.save(position)
    }

    const trade = this.trades.create({
      portfolio_id: portfolio.id,
      contest_id: input.contestId,
      user_id: input.userId,
      symbol: input.symbol,
      side: input.side,
      quantity: input.quantity.toFixed(4),
      price_cents: priceCents,
      notional_cents: notionalCents,
      executed_at: new Date(),
      quote_source: 'mock',
    } as any)
    return this.trades.save(trade)
  }
} 