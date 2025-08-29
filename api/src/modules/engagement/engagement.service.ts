import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PortfolioSubscription } from '../../entities/PortfolioSubscription.entity'
import { PortfolioLike } from '../../entities/PortfolioLike.entity'
import { PortfolioComment } from '../../entities/PortfolioComment.entity'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Subject } from 'rxjs'

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(PortfolioSubscription) private readonly subs: Repository<PortfolioSubscription>,
    @InjectRepository(PortfolioLike) private readonly likes: Repository<PortfolioLike>,
    @InjectRepository(PortfolioComment) private readonly comments: Repository<PortfolioComment>,
    @InjectRepository(PortfolioV2) private readonly portfolios: Repository<PortfolioV2>,
  ) {}

  private streams = new Map<string, Subject<any>>()

  private getStream(portfolioId: string): Subject<any> {
    if (!this.streams.has(portfolioId)) this.streams.set(portfolioId, new Subject<any>())
    return this.streams.get(portfolioId)!
  }

  emitUpdate(portfolioId: string, payload: any) {
    this.getStream(portfolioId).next({ type: 'portfolio.updated', data: payload, at: new Date().toISOString() })
  }

  stream(portfolioId: string) {
    return this.getStream(portfolioId).asObservable()
  }

  async subscribe(portfolioId: string, userId: string) {
    const exists = await this.subs.findOne({ where: { portfolio_id: portfolioId, user_id: userId } })
    if (exists) return { ok: true }
    await this.subs.save({ portfolio_id: portfolioId, user_id: userId } as any)
    return { ok: true }
  }

  async unsubscribe(portfolioId: string, userId: string) {
    await this.subs.delete({ portfolio_id: portfolioId, user_id: userId } as any)
    return { ok: true }
  }

  async like(portfolioId: string, userId: string) {
    const exists = await this.likes.findOne({ where: { portfolio_id: portfolioId, user_id: userId } })
    if (exists) return { ok: true }
    await this.likes.save({ portfolio_id: portfolioId, user_id: userId } as any)
    this.emitUpdate(portfolioId, { likesDelta: 1 })
    return { ok: true }
  }

  async unlike(portfolioId: string, userId: string) {
    const res = await this.likes.delete({ portfolio_id: portfolioId, user_id: userId } as any)
    if (res.affected) this.emitUpdate(portfolioId, { likesDelta: -1 })
    return { ok: true }
  }

  async likesCount(portfolioId: string) {
    const count = await this.likes.count({ where: { portfolio_id: portfolioId } })
    return { count }
  }

  async addComment(portfolioId: string, userId: string, content: string, parentId?: string) {
    let rootId: string | null = null
    let depth = 0
    if (parentId) {
      const parent = await this.comments.findOne({ where: { id: parentId } })
      if (!parent) throw new Error('Parent comment not found')
      rootId = parent.root_id || parent.id
      depth = (parent.depth || 0) + 1
    }
    const saved = await this.comments.save({ portfolio_id: portfolioId, user_id: userId, content, parent_id: parentId || null, root_id: rootId, depth } as any)
    this.emitUpdate(portfolioId, { comment: saved })
    return { ok: true, comment: saved }
  }

    async listComments(portfolioId: string, limit = 50) {
    return this.comments.find({ where: { portfolio_id: portfolioId }, order: { created_at: 'ASC' }, take: limit })
  }
 
  async listThreaded(portfolioId: string, limit = 100) {
    const roots = await this.comments.find({ where: { portfolio_id: portfolioId, depth: 0 } as any, order: { created_at: 'ASC' }, take: limit })
    const byRoot = new Map<string, any>()
    for (const root of roots) {
      const children = await this.comments.find({ where: { root_id: root.id } as any, order: { created_at: 'ASC' } })
      byRoot.set(root.id, { root, replies: children })
    }
    return Array.from(byRoot.values())
  }
} 