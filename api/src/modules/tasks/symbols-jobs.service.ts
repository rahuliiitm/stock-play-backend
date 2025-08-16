import { Injectable, OnModuleInit } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Queue, Worker, JobsOptions } from 'bullmq'
import { getRedis } from '../../lib/redis'
import { SymbolsService } from '../stocks/symbols.service'
import { Cron, CronExpression } from '@nestjs/schedule'

export class SymbolsRefreshedEvent {
  constructor(public readonly exchange: 'NSE' | 'BSE', public readonly dateISO: string) {}
}

const SYMBOLS_QUEUE_NAME = 'symbols-jobs'
const EVENTS_QUEUE_NAME = 'system-events'

function formatDateDDMMYY(d: Date): { dd: string; mm: string; yy: string } {
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yy = String(d.getUTCFullYear()).slice(-2)
  return { dd, mm, yy }
}

function guessBseBhavcopyUrl(d: Date): string[] {
  const base = process.env.BSE_BHAVCOPY_BASE || 'https://www.bseindia.com/download/BhavCopy/Equity/'
  const { dd, mm, yy } = formatDateDDMMYY(d)
  return [`${base}EQ_${dd}${mm}${yy}_CSV.ZIP`, `${base}EQ${dd}${mm}${yy}_CSV.ZIP`]
}

@Injectable()
export class SymbolsJobsService implements OnModuleInit {
  private symbolsQueue: Queue | null = null
  private eventsQueue: Queue | null = null

  constructor(private readonly symbols: SymbolsService) {}

  async onModuleInit() {
    const redis = getRedis()
    if (!redis) return
    const connection = (redis as any).options
    this.symbolsQueue = new Queue(SYMBOLS_QUEUE_NAME, { connection })
    this.eventsQueue = new Queue(EVENTS_QUEUE_NAME, { connection })

    new Worker(
      SYMBOLS_QUEUE_NAME,
      async (job) => {
        if (job.name === 'sync-nse') {
          await this.symbols.sync()
          await this.eventsQueue?.add('symbols.refreshed', new SymbolsRefreshedEvent('NSE', job.data.dateISO))
        }
        if (job.name === 'sync-bse-bhavcopy') {
          const date = job.data?.dateISO ? new Date(job.data.dateISO) : new Date()
          const urls = guessBseBhavcopyUrl(date)
          let lastErr: any = null
          for (const url of urls) {
            try {
              await this.symbols.syncBseBhavcopy(url)
              await this.eventsQueue?.add('symbols.refreshed', new SymbolsRefreshedEvent('BSE', job.data.dateISO))
              return { ok: true, url }
            } catch (e) {
              lastErr = e
            }
          }
          throw lastErr || new Error('All BSE Bhavcopy URL attempts failed')
        }
      },
      { connection },
    )
  }

  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async enqueueDaily() {
    if (!this.symbolsQueue) return
    const todayISO = new Date().toISOString().slice(0, 10)
    const opts: JobsOptions = { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    await this.symbolsQueue.add('sync-nse', { dateISO: todayISO }, { ...opts, jobId: `sync-nse:${todayISO}` })
    await this.symbolsQueue.add('sync-bse-bhavcopy', { dateISO: todayISO }, { ...opts, jobId: `sync-bse-bhavcopy:${todayISO}` })
  }
} 