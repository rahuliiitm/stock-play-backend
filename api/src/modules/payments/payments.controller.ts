import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { PaymentsService } from './payments.service'

class EntryFeeDto {
  contestId!: string
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('entry-fee')
  entryFee(@Body() body: EntryFeeDto, @Req() req: any) {
    return this.svc.createEntryFeeIntent(body.contestId, req.user.sub)
  }
} 