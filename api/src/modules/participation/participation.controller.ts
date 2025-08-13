import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { ParticipationService } from './participation.service'

@Controller()
export class ParticipationController {
  constructor(private readonly svc: ParticipationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('contests/:id/join')
  join(@Param('id') id: string, @Req() req: any) {
    return this.svc.join(id, req.user.sub)
  }

  @Get('contests/:id/participants')
  listParticipants(@Param('id') id: string) {
    return this.svc.listParticipants(id)
  }
} 