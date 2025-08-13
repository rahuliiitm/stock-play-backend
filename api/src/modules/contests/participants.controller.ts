import { Controller, Get, Param, Post } from '@nestjs/common'

@Controller('contests/:id/participants')
export class ParticipantsController {
  @Get()
  list(@Param('id') id: string) {
    return []
  }
}

@Controller('contests/:id')
export class JoinController {
  @Post('join')
  join(@Param('id') id: string) {
    return { id, joined: true }
  }
} 