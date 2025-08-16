import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { PortfolioResult } from '../../entities/PortfolioResult.entity'
import { PortfolioService } from '../portfolio/portfolio.service'
import { QuotesService } from '../stocks/quotes.service'
import { LeaderboardService } from '../leaderboard/leaderboard.service'
import { Queue, Worker, JobsOptions } from 'bullmq'
import { getRedis } from '../../lib/redis'

const PORTFOLIO_QUEUE_NAME = 'portfolio-jobs'

@Injectable()
export class PortfolioJobsService implements OnModuleInit {
  private portfolioQueue!: Queue

  constructor(
    @InjectRepository(Contest) private readonly contests: Repository<Contest>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
    @InjectRepository(Portfolio) private readonly portfolios: Repository<Portfolio>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(StockPriceHistory) private readonly prices: Repository<StockPriceHistory>,
    @InjectRepository(PortfolioResult) private readonly results: Repository<PortfolioResult>,
    private readonly portfolioSvc: PortfolioService,
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
        if (job.name === 'calc-returns') {
          await this.handleCalcReturns(job.data as { contestId: string; asOfISO: string })
        }
      },
      { connection },
    )
  }

  async enqueueCalcReturns(contestId: string, asOfISO: string) {
    const opts: JobsOptions = { jobId: `calc-returns:${contestId}:${asOfISO}`, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
    if (this.portfolioQueue) await this.portfolioQueue.add('calc-returns', { contestId, asOfISO }, opts)
  }

  private async handleCalcReturns(data: { contestId: string; asOfISO: string }) {
    const contest = await this.contests.findOne({ where: { id: data.contestId } })
    if (!contest || contest.status !== 'active') return

    const asOf = new Date(data.asOfISO)
    const eodOnly = String(process.env.EOD_ONLY || '').toLowerCase() === 'true'

    const parts = await this.participants.find({ where: { contest_id: data.contestId } })
    for (const p of parts) {
      const portfolio = await this.portfolios.findOne({ where: { participant_id: p.id } })
      if (!portfolio) continue
      const pos = await this.positions.find({ where: { portfolio_id: portfolio.id } })
      let positionsValue = 0
      for (const x of pos) {
        let row = await this.prices.findOne({ where: { symbol: x.symbol, as_of: new Date(data.asOfISO) } })
        if (!row) {
          row = await this.prices
            .createQueryBuilder('h')
            .where('h.symbol = :sym AND h.as_of <= :asOf', { sym: x.symbol, asOf })
            .orderBy('h.as_of', 'DESC')
            .limit(1)
            .getOne()
        }
        if (row) {
          x.current_value_amount = Math.round(row.ltp * 100 * parseFloat(x.quantity))
          await this.positions.save(x)
          positionsValue += x.current_value_amount
        } else if (!eodOnly) {
          const q = await this.quotes.getQuote(x.symbol)
          x.current_value_amount = Math.round(q.priceCents * parseFloat(x.quantity))
          await this.positions.save(x)
          positionsValue += x.current_value_amount
        }
      }
      const totalValueAmount = p.current_cash_amount + positionsValue
      const returnPercent = ((totalValueAmount - p.starting_balance_amount) / p.starting_balance_amount) * 100
      await this.results
        .createQueryBuilder()
        .insert()
        .into(PortfolioResult)
        .values({ contest_id: data.contestId, participant_id: p.id, as_of: asOf, total_value_amount: totalValueAmount, return_percent: returnPercent })
        .orUpdate(['total_value_amount', 'return_percent'], ['contest_id', 'participant_id', 'as_of'], { skipUpdateIfNoValuesChanged: true })
        .execute()
    }
    await this.leaderboard.snapshotContest(data.contestId)
  }
} 