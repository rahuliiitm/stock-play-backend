import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { Portfolio } from '../../entities/Portfolio.entity'

@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(Contest) private readonly contests: Repository<Contest>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
    @InjectRepository(Portfolio) private readonly portfolios: Repository<Portfolio>,
  ) {}

  async join(contestId: string, userId: string) {
    const contest = await this.contests.findOne({ where: { id: contestId } })
    if (!contest) throw new BadRequestException('Contest not found')
    if (!['scheduled', 'active'].includes(contest.status)) throw new BadRequestException('Contest not joinable')

    const exists = await this.participants.findOne({ where: { contest_id: contestId, user_id: userId } })
    if (exists) throw new BadRequestException('Already joined')

    const participant = this.participants.create({
      contest_id: contestId,
      user_id: userId,
      starting_balance_cents: contest.initial_balance_cents,
      current_cash_cents: contest.initial_balance_cents,
      paid_entry_fee: contest.entry_fee_cents > 0 ? false : true,
    })
    const saved = await this.participants.save(participant)
    const portfolio = this.portfolios.create({ participant_id: saved.id })
    await this.portfolios.save(portfolio)
    return saved
  }

  listParticipants(contestId: string) {
    return this.participants.find({ where: { contest_id: contestId } })
  }
} 