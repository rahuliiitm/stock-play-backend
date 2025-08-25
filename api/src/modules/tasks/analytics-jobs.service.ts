import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { AnalyticsService } from '../analytics/analytics.service'

@Injectable()
export class AnalyticsJobsService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolios: Repository<Portfolio>,
    
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
        relations: ['participant', 'positions']
      })
      
      for (const portfolio of portfolios) {
        try {
          await this.analytics.calculateDailyPortfolioPerformance(portfolio.id, date)
          
          // Calculate performance for all positions in this portfolio
          for (const position of portfolio.positions) {
            await this.analytics.calculateDailyPositionPerformance(position.id, date)
          }
          
          console.log(`Calculated performance for portfolio ${portfolio.id}`)
        } catch (error) {
          console.error(`Error calculating performance for portfolio ${portfolio.id}:`, error)
        }
      }
      
      // Calculate market movers
      await this.analytics.calculateDailyGainersLosers(date)
      
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
      await this.analytics.calculateDailyGainersLosers(date, 10) // Top 10
      
      console.log('Weekly performance calculation completed successfully')
    } catch (error) {
      console.error('Error in weekly performance calculation:', error)
    }
  }

  // Manual trigger for performance calculation
  async triggerPerformanceCalculation(date?: Date) {
    const calculationDate = date || new Date()
    
    const portfolios = await this.portfolios.find({
      relations: ['participant', 'positions']
    })
    
    const results = {
      portfoliosProcessed: 0,
      positionsProcessed: 0,
      errors: [] as string[]
    }
    
    for (const portfolio of portfolios) {
      try {
        await this.analytics.calculateDailyPortfolioPerformance(portfolio.id, calculationDate)
        results.portfoliosProcessed++
        
        for (const position of portfolio.positions) {
          await this.analytics.calculateDailyPositionPerformance(position.id, calculationDate)
          results.positionsProcessed++
        }
      } catch (error) {
        results.errors.push(`Portfolio ${portfolio.id}: ${error.message}`)
      }
    }
    
    // Calculate market movers
    await this.analytics.calculateDailyGainersLosers(calculationDate)
    
    return results
  }
} 