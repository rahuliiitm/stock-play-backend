import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Repository } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'

@Injectable()
export class ContestLifecycleService {
  constructor(@InjectRepository(Contest) private readonly contests: Repository<Contest>) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async activateDueContestsCron() {
    await this.activateDueContests()
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async endDueContestsCron() {
    await this.endDueContests()
  }

  async activateDueContests(now = new Date()) {
    await this.contests
      .createQueryBuilder()
      .update()
      .set({ status: 'active' as any })
      .where('status = :scheduled AND starts_at <= :now', { scheduled: 'scheduled', now })
      .execute()
  }

  async endDueContests(now = new Date()) {
    await this.contests
      .createQueryBuilder()
      .update()
      .set({ status: 'ended' as any })
      .where('status = :active AND ends_at <= :now', { active: 'active', now })
      .execute()
  }
} 