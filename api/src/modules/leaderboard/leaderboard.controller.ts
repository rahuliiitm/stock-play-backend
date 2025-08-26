import { Controller, Get, Param } from '@nestjs/common'
import { LeaderboardService } from './leaderboard.service'

@Controller()
export class LeaderboardController {
  constructor(private readonly svc: LeaderboardService) {}

  @Get('leaderboard/global')
  global() {
    return this.svc.globalLeaderboard()
  }

  @Get('leaderboard/:window')
  getLeaderboard(@Param('window') window: string) {
    return this.svc.getLeaderboard(window as any)
  }
} 