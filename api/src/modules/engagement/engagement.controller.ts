import { Body, Controller, Delete, Get, Param, Post, Query, Req, Sse, UseGuards } from '@nestjs/common'
import { EngagementService } from './engagement.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { map, Observable } from 'rxjs'

@Controller('engagement')
export class EngagementController {
  constructor(private readonly svc: EngagementService) {}

  @UseGuards(JwtAuthGuard)
  @Post('portfolio/:id/subscribe')
  subscribe(@Param('id') portfolioId: string, @Req() req: any) {
    return this.svc.subscribe(portfolioId, req.user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('portfolio/:id/subscribe')
  unsubscribe(@Param('id') portfolioId: string, @Req() req: any) {
    return this.svc.unsubscribe(portfolioId, req.user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Post('portfolio/:id/like')
  like(@Param('id') portfolioId: string, @Req() req: any) { return this.svc.like(portfolioId, req.user.sub) }

  @UseGuards(JwtAuthGuard)
  @Delete('portfolio/:id/like')
  unlike(@Param('id') portfolioId: string, @Req() req: any) { return this.svc.unlike(portfolioId, req.user.sub) }

  @Get('portfolio/:id/likes-count')
  likesCount(@Param('id') portfolioId: string) { return this.svc.likesCount(portfolioId) }

  @UseGuards(JwtAuthGuard)
  @Post('portfolio/:id/comments')
  addComment(@Param('id') portfolioId: string, @Req() req: any, @Body() body: { content: string; parentId?: string }) {
    return this.svc.addComment(portfolioId, req.user.sub, body.content, body.parentId)
  }

  @Get('portfolio/:id/comments')
  listComments(@Param('id') portfolioId: string, @Query('limit') limit?: string) {
    return this.svc.listComments(portfolioId, limit ? parseInt(limit) : 50)
  }

  @Get('portfolio/:id/comments-threaded')
  listThreaded(@Param('id') portfolioId: string, @Query('limit') limit?: string) {
    return this.svc.listThreaded(portfolioId, limit ? parseInt(limit) : 100)
  }

  @Sse('portfolio/:id/stream')
  stream(@Param('id') portfolioId: string): Observable<MessageEvent> {
    return this.svc.stream(portfolioId).pipe(map((data) => ({ data }) as any))
  }
} 