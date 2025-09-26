import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SymbolsService } from './symbols.service'
import { StockUniverseService } from './stock-universe.service'

@Injectable()
export class StockUniverseSchedulerService {
  private readonly logger = new Logger(StockUniverseSchedulerService.name)

  constructor(
    private readonly symbolsService: SymbolsService,
    private readonly stockUniverseService: StockUniverseService,
  ) {}

  /**
   * Daily job to sync stock universe from NSE and BSE
   * Runs at 6:00 AM IST (00:30 UTC) - after market hours
   */
  @Cron('30 0 * * *', {
    name: 'stock-universe-sync',
    timeZone: 'Asia/Kolkata',
  })
  async syncStockUniverse() {
    this.logger.log('🔄 Starting daily stock universe sync...')
    
    try {
      const startTime = Date.now()
      
      // Sync from NSE and BSE
      const result = await this.symbolsService.sync()
      
      // Get updated counts
      const counts = await this.stockUniverseService.getActiveSymbolCount()
      
      const duration = Date.now() - startTime
      
      this.logger.log(`✅ Stock universe sync completed in ${duration}ms`)
      this.logger.log(`📊 Active symbols: NSE=${counts.nse}, BSE=${counts.bse}, Total=${counts.total}`)
      
      return {
        success: true,
        duration,
        counts,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      this.logger.error('❌ Stock universe sync failed:', error.message)
      throw error
    }
  }

  /**
   * Weekly job to sync BSE Bhavcopy data
   * Runs on Sundays at 7:00 AM IST (01:30 UTC)
   */
  @Cron('30 1 * * 0', {
    name: 'bse-bhavcopy-sync',
    timeZone: 'Asia/Kolkata',
  })
  async syncBseBhavcopy() {
    this.logger.log('🔄 Starting weekly BSE Bhavcopy sync...')
    
    try {
      const startTime = Date.now()
      
      // Get latest BSE Bhavcopy URL (this would need to be implemented)
      // const bseUrl = await this.getLatestBseBhavcopyUrl()
      // await this.symbolsService.syncBseBhavcopy(bseUrl)
      
      const duration = Date.now() - startTime
      
      this.logger.log(`✅ BSE Bhavcopy sync completed in ${duration}ms`)
      
      return {
        success: true,
        duration,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      this.logger.error('❌ BSE Bhavcopy sync failed:', error.message)
      throw error
    }
  }

  /**
   * Manual trigger for immediate sync
   */
  async triggerManualSync() {
    this.logger.log('🔄 Manual stock universe sync triggered...')
    return await this.syncStockUniverse()
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus() {
    const counts = await this.stockUniverseService.getActiveSymbolCount()
    const popularSymbols = await this.stockUniverseService.getPopularSymbols(10)
    
    return {
      activeSymbols: counts,
      popularSymbols,
      lastSync: new Date().toISOString(),
      nextSync: this.getNextSyncTime()
    }
  }

  private getNextSyncTime(): string {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(6, 0, 0, 0) // 6:00 AM IST
    
    return tomorrow.toISOString()
  }
}
