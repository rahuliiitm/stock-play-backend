import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { QuotesService } from '../stocks/quotes.service'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { PortfolioTransaction } from '../../entities/PortfolioTransaction.entity'
import { EngagementService } from '../engagement/engagement.service'

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name)

  constructor(
    @InjectRepository(StockPriceHistory) private readonly prices: Repository<StockPriceHistory>,
    @InjectRepository(Portfolio) private readonly portfolios: Repository<Portfolio>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
    @InjectRepository(PortfolioTransaction) private readonly transactions: Repository<PortfolioTransaction>,
    private readonly quotes: QuotesService,
    private readonly engagement: EngagementService,
  ) {}

  private async getParticipantPortfolio(userId: string, contestId: string): Promise<{ participant: ContestParticipant; portfolio: Portfolio }> {
    const participant = await this.participants.findOne({ where: { user_id: userId, contest_id: contestId } })
    if (!participant) throw new NotFoundException('Participant not found in this contest')

    let portfolio = await this.portfolios.findOne({ where: { participant_id: participant.id } })
    if (!portfolio) {
      portfolio = await this.portfolios.save(this.portfolios.create({ participant_id: participant.id }))
    }
    return { participant, portfolio }
  }

  async fetchAndStoreEod(symbols: string[], asOfISO: string) {
    const results: StockPriceHistory[] = []
    for (const symbol of symbols) {
      const candles = await this.quotes.getHistory(symbol, `${asOfISO} 09:15:00`, `${asOfISO} 15:30:00`, 1)
      if (!candles || candles.length === 0) continue
      const ltp = candles[candles.length - 1].close
      const row = this.prices.create({ symbol, as_of: new Date(asOfISO), ltp, volume: null })
      await this.prices
        .createQueryBuilder()
        .insert()
        .into(StockPriceHistory)
        .values(row)
        .orUpdate(['ltp', 'volume'], ['symbol', 'as_of'], { skipUpdateIfNoValuesChanged: true })
        .execute()
      results.push(row)
    }
    return results
  }

  async getCurrentPortfolio(userId: string, contestId: string) {
    const { participant, portfolio } = await this.getParticipantPortfolio(userId, contestId)
    const pos = await this.positions.find({ where: { portfolio_id: portfolio.id } })
    return {
      positions: pos.map((p) => ({
        symbol: p.symbol,
        quantity: Number(p.quantity),
        avgCost: p.avg_cost_amount / 100,
        currentValue: p.current_value_amount / 100,
      })),
      cash: participant.current_cash_amount / 100,
    }
  }

  async addStockToPortfolio(userId: string, contestId: string, symbol: string, quantity: number) {
    if (quantity <= 0) return { ok: false, message: 'Quantity must be positive' }
    const { participant, portfolio } = await this.getParticipantPortfolio(userId, contestId)

    const quote = await this.quotes.getQuote(symbol)
    const priceAmount = quote.priceCents
    const notional = Math.round(priceAmount * quantity)

    if (participant.current_cash_amount < notional) return { ok: false, message: 'Insufficient cash' }

    let position = await this.positions.findOne({ where: { portfolio_id: portfolio.id, symbol } })
    if (position) {
      const existingQty = Number(position.quantity)
      const newQty = existingQty + quantity
      const totalValue = position.avg_cost_amount * existingQty + notional
      position.avg_cost_amount = Math.round(totalValue / newQty)
      position.quantity = String(newQty)
    } else {
      position = this.positions.create({
        portfolio_id: portfolio.id,
        symbol,
        quantity: String(quantity),
        avg_cost_amount: priceAmount,
      })
    }
    await this.positions.save(position)

    await this.transactions.save(
      this.transactions.create({ portfolio_id: portfolio.id, symbol, quantity_delta: String(quantity), price_amount: priceAmount, value_amount: notional, type: 'BUY' }),
    )
    participant.current_cash_amount -= notional
    await this.participants.save(participant)

    this.engagement.emitUpdate(portfolio.id, { type: 'BUY', symbol, quantity })
    return { ok: true }
  }

  async removeStockFromPortfolio(userId: string, contestId: string, symbol: string) {
    const { participant, portfolio } = await this.getParticipantPortfolio(userId, contestId)
    const position = await this.positions.findOne({ where: { portfolio_id: portfolio.id, symbol } })
    if (!position) return { ok: true, message: 'Position not found' }

    const quantity = Number(position.quantity)
    if (quantity <= 0) {
      await this.positions.delete({ id: position.id })
      return { ok: true, message: 'Cleared zero-quantity position' }
    }

    const quote = await this.quotes.getQuote(symbol)
    const priceAmount = quote.priceCents
    const proceeds = Math.round(priceAmount * quantity)

    await this.transactions.save(
      this.transactions.create({ portfolio_id: portfolio.id, symbol, quantity_delta: String(-quantity), price_amount: priceAmount, value_amount: proceeds, type: 'SELL' }),
    )
    participant.current_cash_amount += proceeds
    await this.participants.save(participant)

    await this.positions.delete({ id: position.id })

    this.engagement.emitUpdate(portfolio.id, { type: 'SELL', symbol, quantity })
    return { ok: true }
  }

  async rebalancePortfolio(userId: string, contestId: string, updates: Array<{ symbol: string; quantity: number }>) {
    const { participant, portfolio } = await this.getParticipantPortfolio(userId, contestId)
    for (const u of updates) {
      if (u.quantity < 0) continue
      let position = await this.positions.findOne({ where: { portfolio_id: portfolio.id, symbol: u.symbol } })
      const currentQty = position ? Number(position.quantity) : 0
      const delta = u.quantity - currentQty
      if (delta === 0) continue

      const quote = await this.quotes.getQuote(u.symbol)
      const priceAmount = quote.priceCents

      if (delta > 0) {
        const notional = Math.round(priceAmount * delta)
        if (participant.current_cash_amount < notional) continue
        if (position) {
          const newQty = currentQty + delta
          const totalValue = position.avg_cost_amount * currentQty + notional
          position.avg_cost_amount = Math.round(totalValue / newQty)
          position.quantity = String(newQty)
        } else {
          position = this.positions.create({ portfolio_id: portfolio.id, symbol: u.symbol, quantity: String(delta), avg_cost_amount: priceAmount })
        }
        await this.positions.save(position)
        await this.transactions.save(this.transactions.create({ portfolio_id: portfolio.id, symbol: u.symbol, quantity_delta: String(delta), price_amount: priceAmount, value_amount: notional, type: 'BUY' }))
        participant.current_cash_amount -= notional
        this.engagement.emitUpdate(portfolio.id, { type: 'BUY', symbol: u.symbol, quantity: delta })
      } else {
        const sellQty = -delta
        if (position) {
          const proceeds = Math.round(priceAmount * sellQty)
          position.quantity = String(currentQty - sellQty)
          if (position.quantity === '0') {
            await this.positions.delete({ id: position.id })
          } else {
            await this.positions.save(position)
          }
          await this.transactions.save(this.transactions.create({ portfolio_id: portfolio.id, symbol: u.symbol, quantity_delta: String(-sellQty), price_amount: priceAmount, value_amount: proceeds, type: 'SELL' }))
          participant.current_cash_amount += proceeds
          this.engagement.emitUpdate(portfolio.id, { type: 'SELL', symbol: u.symbol, quantity: sellQty })
        }
      }
    }
    await this.participants.save(participant)
    return { ok: true }
  }
} 