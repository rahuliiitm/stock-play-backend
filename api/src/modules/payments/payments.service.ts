import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class PaymentsService {
  async createEntryFeeIntent(contestId: string, userId: string) {
    if (!contestId || !userId) throw new BadRequestException('Invalid params')
    // Stub: return fake client secret
    return { clientSecret: 'pi_client_secret_stub' }
  }
} 