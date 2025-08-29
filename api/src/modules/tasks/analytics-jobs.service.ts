import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Position } from '../../entities/Position.entity'
import { AnalyticsService } from '../analytics/analytics.service'

@Injectable()
export class AnalyticsJobsService {
  constructor(
    @InjectRepository(PortfolioV2)
    private readonly portfolios: Repository<PortfolioV2>,
    
    @InjectRepository(Position)
    private readonly positions: Repository<Position>,
    
    private readonly analytics: AnalyticsService,
  ) {}

  // Run daily performance calculations at 6 PM IST (after market close)
  @Cron('0 18 * * 1-5', { timeZone: 'Asia/Kolkata' })
  async dailyPerformanceCalculation() {
    console.log('Starting daily portfolio performance calculation...')
    
    try {
      const date = new Date()
      
      // Calculate performance for all active portfolios
      const portfolios = await this.portfolios.find({
        relations: ['user', 'holdings']
      })
      
      for (const portfolio of portfolios) {
        try {
          await this.analytics.calculateDailyPortfolioPerformance(portfolio.id, date)
          
          // Calculate performance for all holdings in this portfolio
          for (const holding of portfolio.holdings) {
            await this.analytics.calculateDailyPositionPerformance(holding.id, date)
          }
          
          console.log(`Calculated performance for portfolio ${portfolio.id}`)
        } catch (error) {
          console.error(`Error calculating performance for portfolio ${portfolio.id}:`, error)
        }
      }
      
      // Calculate market movers
      // TODO: Implement market movers calculation for new system
      console.log('Market movers calculation not yet implemented')
      
      console.log('Daily performance calculation completed successfully')
    } catch (error) {
      console.error('Error in daily performance calculation:', error)
    }
  }

  // Run weekly performance calculations on Saturday morning
  @Cron('0 9 * * 6', { timeZone: 'Asia/Kolkata' })
  async weeklyPerformanceCalculation() {
    console.log('Starting weekly portfolio performance calculation...')
    
    try {
      const date = new Date()
      
      // Calculate weekly gainers/losers
      // TODO: Implement market movers calculation for new system
      console.log('Market movers calculation not yet implemented')
      
      console.log('Weekly performance calculation completed successfully')
    } catch (error) {
      console.error('Error in weekly performance calculation:', error)
    }
  }

  // Manual trigger for performance calculation
  async triggerPerformanceCalculation(date?: Date) {
    const calculationDate = date || new Date()
    
    const portfolios = await this.portfolios.find({
      relations: ['user', 'holdings']
    })
    
    const results = {
      portfoliosProcessed: 0,
      holdingsProcessed: 0,
      errors: [] as string[]
    }
    
    for (const portfolio of portfolios) {
      try {
        await this.analytics.calculateDailyPortfolioPerformance(portfolio.id, calculationDate)
        results.portfoliosProcessed++
        
        for (const holding of portfolio.holdings) {
          await this.analytics.calculateDailyPositionPerformance(holding.id, calculationDate)
          results.holdingsProcessed++
        }
      } catch (error) {
        results.errors.push(`Portfolio ${portfolio.id}: ${error.message}`)
      }
    }
    
    // Calculate market movers
    // TODO: Implement market movers calculation for new system
    console.log('Market movers calculation not yet implemented')
    
    return results
  }
} 