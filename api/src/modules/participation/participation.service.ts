import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contest } from '../../entities/Contest.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'

@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(Contest) private readonly contests: Repository<Contest>,
    @InjectRepository(ContestParticipant) private readonly participants: Repository<ContestParticipant>,
  ) {}

  async join(contestId: string, userId: string) {
    const contest = await this.contests.findOneOrFail({ where: { id: contestId } })
    const row = this.participants.create({
      contest_id: contestId,
      user_id: userId,
      starting_balance_amount: contest.initial_balance_amount,
      current_cash_amount: contest.initial_balance_amount,
      paid_entry_fee: contest.entry_fee_amount > 0 ? false : true,
    })
    return this.participants.save(row)
  }

  async listParticipants(contestId: string) {
    return this.participants.find({ where: { contest_id: contestId } })
  }
} 