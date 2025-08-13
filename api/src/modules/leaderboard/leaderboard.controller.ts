import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { LeaderboardService } from './leaderboard.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller()
export class LeaderboardController {
  constructor(private readonly svc: LeaderboardService) {}

  @Get('contests/:id/leaderboard')
  contest(@Param('id') id: string) {
    return this.svc.contestLeaderboard(id)
  }

  @Get('leaderboard')
  global() {
    return this.svc.globalLeaderboard()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('contests/:id/leaderboard/snapshot')
  snapshot(@Param('id') id: string) {
    return this.svc.snapshotContest(id)
  }
} 