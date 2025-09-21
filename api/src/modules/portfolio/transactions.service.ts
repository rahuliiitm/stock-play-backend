import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PortfolioTransactionV2 } from '../../entities/PortfolioTransactionV2.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { TransactionType } from '../../entities/PortfolioTransactionV2.entity'

export interface TransactionSummary {
  id: string
  portfolioId: string
  symbol: string | null
  exchange: 'NSE' | 'BSE' | null
  quantityDelta: number | null
  price: number | null
  fees: number | null
  type: TransactionType
  createdAt: Date
}

export interface TransactionFilter {
  type?: TransactionType
  symbol?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name)

  constructor(
    @InjectRepository(PortfolioTransactionV2)
    private readonly transactions: Repository<PortfolioTransactionV2>,
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
  ) {}

  async createTransaction(
    portfolioId: string,
    symbol: string | null,
    exchange: 'NSE' | 'BSE' | null,
    quantityDelta: number | null,
    price: number | null,
    fees: number | null,
    type: TransactionType,
  ): Promise<PortfolioTransactionV2> {
    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found')
    }

    const transaction = this.transactions.create({
      portfolioId: portfolioId,
      symbol,
      exchange,
      quantity_delta: quantityDelta ? String(quantityDelta) : null,
      price: price,
      fees: fees,
      type,
    })

    return this.transactions.save(transaction)
  }

  async getPortfolioTransactions(
    portfolioId: string,
    filter: TransactionFilter = {},
  ): Promise<TransactionSummary[]> {
    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found')
    }

    let query = this.transactions
      .createQueryBuilder('t')
      .where('t.portfolioId = :portfolioId', { portfolioId })
      .orderBy('t.created_at', 'DESC')

    if (filter.type) {
      query = query.andWhere('t.type = :type', { type: filter.type })
    }

    if (filter.symbol) {
      query = query.andWhere('t.symbol = :symbol', { symbol: filter.symbol })
    }

    if (filter.fromDate) {
      query = query.andWhere('t.created_at >= :fromDate', { fromDate: filter.fromDate })
    }

    if (filter.toDate) {
      query = query.andWhere('t.created_at <= :toDate', { toDate: filter.toDate })
    }

    if (filter.limit) {
      query = query.limit(filter.limit)
    }

    if (filter.offset) {
      query = query.offset(filter.offset)
    }

    const transactions = await query.getMany()

    return transactions.map(t => ({
      id: t.id,
      portfolioId: t.portfolioId,
      symbol: t.symbol,
      exchange: t.exchange,
      quantityDelta: t.quantity_delta ? Number(t.quantity_delta) : null,
      price: t.price,
      fees: t.fees,
      type: t.type,
      createdAt: t.created_at,
    }))
  }

  async getTransaction(transactionId: string): Promise<TransactionSummary | null> {
    const transaction = await this.transactions.findOne({ where: { id: transactionId } })
    if (!transaction) return null

    return {
      id: transaction.id,
      portfolioId: transaction.portfolioId,
      symbol: transaction.symbol,
      exchange: transaction.exchange,
      quantityDelta: transaction.quantity_delta ? Number(transaction.quantity_delta) : null,
      price: transaction.price,
      fees: transaction.fees,
      type: transaction.type,
      createdAt: transaction.created_at,
    }
  }

  async getTransactionsBySymbol(symbol: string, limit = 100): Promise<TransactionSummary[]> {
    const transactions = await this.transactions
      .createQueryBuilder('t')
      .where('t.symbol = :symbol', { symbol })
      .orderBy('t.created_at', 'DESC')
      .limit(limit)
      .getMany()

    return transactions.map(t => ({
      id: t.id,
      portfolioId: t.portfolioId,
      symbol: t.symbol,
      exchange: t.exchange,
      quantityDelta: t.quantity_delta ? Number(t.quantity_delta) : null,
      price: t.price,
      fees: t.fees,
      type: t.type,
      createdAt: t.created_at,
    }))
  }

  async getPortfolioTransactionSummary(portfolioId: string): Promise<{
    totalTransactions: number
    buyTransactions: number
    sellTransactions: number
    depositTransactions: number
    withdrawTransactions: number
    totalFees: number
  }> {
    const portfolio = await this.portfolios.findOne({ where: { id: portfolioId } })
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found')
    }

    const result = await this.transactions
      .createQueryBuilder('t')
      .select([
        'COUNT(*) as totalTransactions',
        'SUM(CASE WHEN t.type = \'BUY\' THEN 1 ELSE 0 END) as buyTransactions',
        'SUM(CASE WHEN t.type = \'SELL\' THEN 1 ELSE 0 END) as sellTransactions',
        'SUM(CASE WHEN t.type = \'DEPOSIT\' THEN 1 ELSE 0 END) as depositTransactions',
        'SUM(CASE WHEN t.type = \'WITHDRAW\' THEN 1 ELSE 0 END) as withdrawTransactions',
        'SUM(COALESCE(t.fees, 0)) as totalFees',
      ])
      .where('t.portfolioId = :portfolioId', { portfolioId })
      .getRawOne()

    return {
      totalTransactions: parseInt(result.totalTransactions || '0'),
      buyTransactions: parseInt(result.buyTransactions || '0'),
      sellTransactions: parseInt(result.sellTransactions || '0'),
      depositTransactions: parseInt(result.depositTransactions || '0'),
      withdrawTransactions: parseInt(result.withdrawTransactions || '0'),
      totalFees: Number(result.totalFees || '0'),
    }
  }

  async deleteTransaction(transactionId: string): Promise<{ ok: boolean; message?: string }> {
    const transaction = await this.transactions.findOne({ where: { id: transactionId } })
    if (!transaction) {
      return { ok: false, message: 'Transaction not found' }
    }

    // Check if this is the most recent transaction for the portfolio
    // This is a simple check - in production you'd want more sophisticated validation
    const recentTransaction = await this.transactions
      .createQueryBuilder('t')
      .where('t.portfolioId = :portfolioId', { portfolioId: transaction.portfolioId })
      .orderBy('t.created_at', 'DESC')
      .limit(1)
      .getOne()

    if (recentTransaction && recentTransaction.id !== transactionId) {
      return { ok: false, message: 'Can only delete the most recent transaction' }
    }

    await this.transactions.remove(transaction)
    return { ok: true }
  }
}

