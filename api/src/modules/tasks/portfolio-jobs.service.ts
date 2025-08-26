import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity'
import { PortfolioServiceV2 } from '../portfolio/portfolio-v2.service'
import { QuotesService } from '../stocks/quotes.service'
import { LeaderboardService } from '../leaderboard/leaderboard.service'
import { Queue, Worker, JobsOptions } from 'bullmq'
import { getRedis } from '../../lib/redis'

const PORTFOLIO_QUEUE_NAME = 'portfolio-jobs'

@Injectable()
export class PortfolioJobsService implements OnModuleInit {
  private portfolioQueue!: Queue

  constructor(
    @InjectRepository(StockPriceHistory) private readonly prices: Repository<StockPriceHistory>,
    @InjectRepository(PortfolioV2) private readonly portfolios: Repository<PortfolioV2>,
    @InjectRepository(Holding) private readonly holdings: Repository<Holding>,
    @InjectRepository(PortfolioSnapshotV2) private readonly snapshots: Repository<PortfolioSnapshotV2>,
    private readonly portfolioSvc: PortfolioServiceV2,
    private readonly quotes: QuotesService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async onModuleInit() {
    const redis = getRedis()
    if (!redis) return
    const connection = (redis as any).options
    this.portfolioQueue = new Queue(PORTFOLIO_QUEUE_NAME, { connection })

    new Worker(
      PORTFOLIO_QUEUE_NAME,
      async (job) => {
        if (job.name === 'create-snapshot') {
          await this.handleCreateSnapshot(job.data as { portfolioId: string; asOfISO: string })
        }
      },
      { connection },
    )
  }

  async enqueueCreateSnapshot(portfolioId: string, asOfISO: string) {
    const opts: JobsOptions = { jobId: `create-snapshot:${portfolioId}:${asOfISO}`, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
    if (this.portfolioQueue) await this.portfolioQueue.add('create-snapshot', { portfolioId, asOfISO }, opts)
  }

  private async handleCreateSnapshot(data: { portfolioId: string; asOfISO: string }) {
    const portfolio = await this.portfolios.findOne({ where: { id: data.portfolioId } })
    if (!portfolio) return

    const asOf = new Date(data.asOfISO)
    const holdings = await this.holdings.find({ where: { portfolio_id: data.portfolioId } })
    
    let totalValueCents = 0
    for (const holding of holdings) {
      let priceRow = await this.prices.findOne({ where: { symbol: holding.symbol, as_of: new Date(data.asOfISO) } })
      if (!priceRow) {
        priceRow = await this.prices
          .createQueryBuilder('h')
          .where('h.symbol = :sym AND h.as_of <= :asOf', { sym: holding.symbol, asOf })
          .orderBy('h.as_of', 'DESC')
          .limit(1)
          .getOne()
      }
      
      if (priceRow) {
        const currentPriceCents = Math.round(priceRow.ltp * 100)
        const currentValueCents = Math.round(currentPriceCents * parseFloat(holding.quantity))
        holding.current_value_cents = currentValueCents
        await this.holdings.save(holding)
        totalValueCents += currentValueCents
      } else {
        // Fallback to live quote
        const quote = await this.quotes.getQuote(holding.symbol)
        holding.current_value_cents = Math.round(quote.priceCents * parseFloat(holding.quantity))
        await this.holdings.save(holding)
        totalValueCents += holding.current_value_cents
      }
    }

    // Calculate return percentage
    const initialValueCents = portfolio.initial_value_cents || 0
    const returnPercent = initialValueCents > 0 ? ((totalValueCents - initialValueCents) / initialValueCents) * 100 : 0

    // Create snapshot
    await this.snapshots.save(
      this.snapshots.create({
        portfolio_id: data.portfolioId,
        date: asOf,
        market_value_cents: totalValueCents,
        return_percent: returnPercent,
      })
    )

    // Update leaderboard
    await this.leaderboard.updatePortfolioRank(data.portfolioId, returnPercent)
  }
} 