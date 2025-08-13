import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest) private readonly repo: Repository<Contest>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
  ) {}

  async list(status?: string) {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.starts_at', 'DESC')
    if (status) qb.andWhere('c.status = :status', { status })
    return qb.getMany()
  }

  async get(id: string) {
    const contest = await this.repo.findOne({ where: { id } })
    if (!contest) throw new NotFoundException('Contest not found')
    return contest
  }

  async countParticipants(contestId: string) {
    return this.participants.count({ where: { contest_id: contestId } })
  }

  create(input: Partial<Contest>) {
    const c = this.repo.create(input)
    return this.repo.save(c)
  }

  async update(id: string, input: Partial<Contest>) {
    const c = await this.get(id)
    Object.assign(c, input)
    return this.repo.save(c)
  }
} 