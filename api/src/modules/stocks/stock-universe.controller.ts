import { Controller, Get, Post, UseGuards, Query, Param } from '@nestjs/common'
import { StockUniverseSchedulerService } from './stock-universe-scheduler.service'
import { StockUniverseService } from './stock-universe.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('stock-universe')
export class StockUniverseController {
  constructor(
    private readonly scheduler: StockUniverseSchedulerService,
    private readonly stockUniverse: StockUniverseService,
  ) {}

  /**
   * Get stock universe statistics
   */
  @Get('stats')
  async getStats() {
    const counts = await this.stockUniverse.getActiveSymbolCount()
    const popularSymbols = await this.stockUniverse.getPopularSymbols(20)
    
    return {
      activeSymbols: counts,
      popularSymbols,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get sync status and next scheduled sync
   */
  @Get('sync-status')
  async getSyncStatus() {
    return await this.scheduler.getSyncStatus()
  }

  /**
   * Manual trigger for stock universe sync (Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('sync')
  async triggerSync() {
    return await this.scheduler.triggerManualSync()
  }

  /**
   * Search stocks in the universe
   */
  @Get('search')
  async searchStocks(@Query('q') query: string, @Query('limit') limit?: number) {
    return await this.stockUniverse.searchStocks(query, limit || 20)
  }

  /**
   * Get all active symbols for a specific exchange
   */
  @Get('symbols')
  async getSymbols(@Query('exchange') exchange?: 'NSE' | 'BSE') {
    return await this.stockUniverse.getActiveSymbols(exchange)
  }

  /**
   * Get symbol details by symbol and exchange
   */
  @Get('symbols/:symbol')
  async getSymbolDetails(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: 'NSE' | 'BSE'
  ) {
    if (exchange) {
      return await this.stockUniverse.getSymbolDetails(symbol, exchange)
    }
    
    // Try both exchanges if not specified
    const nseResult = await this.stockUniverse.getSymbolDetails(symbol, 'NSE')
    if (nseResult) return nseResult
    
    const bseResult = await this.stockUniverse.getSymbolDetails(symbol, 'BSE')
    return bseResult
  }
}
