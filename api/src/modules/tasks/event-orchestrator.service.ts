import { Injectable, OnModuleInit } from '@nestjs/common'
import { Worker } from 'bullmq'
import { getRedis } from '../../lib/redis'
import { PortfolioJobsService } from './portfolio-jobs.service'
import { SymbolsRefreshedEvent } from './symbols-jobs.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Contest } from '../../entities/Contest.entity'
import { Repository } from 'typeorm'

const EVENTS_QUEUE_NAME = 'system-events'

@Injectable()
export class EventOrchestratorService implements OnModuleInit {
  constructor(
    @InjectRepository(Contest) private readonly contests: Repository<Contest>,
    private readonly portfolioJobs: PortfolioJobsService,
  ) {}

  async onModuleInit() {
    const redis = getRedis()
    if (!redis) return
    const connection = (redis as any).options

    new Worker(
      EVENTS_QUEUE_NAME,
      async (job) => {
        if (job.name === 'symbols.refreshed') {
          const payload = job.data as SymbolsRefreshedEvent
          const activeContests = await this.contests.find({ where: { status: 'active' as any } })
          for (const contest of activeContests) {
            // Orchestration Logic: Route based on contest type
            if (contest.contest_type === 'PORTFOLIO') {
              await this.portfolioJobs.enqueueCalcReturns(contest.id, payload.dateISO)
            }
            // else if (contest.contest_type === 'GAP_DIRECTION') {
            //   await this.scoringJobs.enqueueScoreContest(contest.id, payload.dateISO)
            // }
          }
        }
      },
      { connection },
    )
  }
} 