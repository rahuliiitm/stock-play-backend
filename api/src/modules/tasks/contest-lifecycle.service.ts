import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'
import { PortfolioJobsService } from './portfolio-jobs.service'

@Injectable()
export class ContestLifecycleService {
  constructor(@InjectRepository(Contest) private readonly contests: Repository<Contest>, private readonly portfolioJobs: PortfolioJobsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scan() {
    const now = new Date()
    // activate due contests
    await this.contests
      .createQueryBuilder()
      .update()
      .set({ status: 'active' as any })
      .where('status = :draft AND starts_at <= :now', { draft: 'draft', now })
      .execute()
    // end due contests
    const ended = await this.contests.find({ where: { status: 'active' as any, ends_at: LessThanOrEqual(now) } })
    for (const c of ended) {
      c.status = 'ended' as any
      await this.contests.save(c)
      const dateISO = now.toISOString().slice(0, 10)
      // This will trigger calculation since the symbols refresh will fire an event
      // No direct call to calc is needed here if we assume symbols jobs run daily
    }
  }
} 