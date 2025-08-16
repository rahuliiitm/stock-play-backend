import { Controller, Get, Param } from '@nestjs/common'
import { LeaderboardService } from './leaderboard.service'

@Controller()
export class LeaderboardController {
  constructor(private readonly svc: LeaderboardService) {}

  @Get('contests/:id/leaderboard')
  contestUi(@Param('id') id: string) {
    return this.svc.contestLeaderboard(id)
  }

  @Get('leaderboard/contests/:contestId')
  contest(@Param('contestId') contestId: string) {
    return this.svc.contestLeaderboard(contestId)
  }

  @Get('leaderboard/global')
  global() {
    return this.svc.globalLeaderboard()
  }
} 