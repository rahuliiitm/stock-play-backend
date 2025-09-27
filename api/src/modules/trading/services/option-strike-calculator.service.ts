import { Injectable, Logger } from '@nestjs/common'
import { GrowwApiService } from '../../broker/services/groww-api.service'

export interface OptionStrike {
  strike: number
  type: 'CE' | 'PE'
  symbol: string // e.g., "NIFTY25SEP24900PE"
  expiry: string // e.g., "25SEP24"
  isATM: boolean
  isITM: boolean
  isOTM: boolean
}

export interface StrikeSelectionConfig {
  callStrikes: ('ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM')[]
  putStrikes: ('ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM')[]
  expiryDays?: number
  lotSize?: number
  strikeIncrement?: number
}

@Injectable()
export class OptionStrikeCalculatorService {
  private readonly logger = new Logger(OptionStrikeCalculatorService.name)

  constructor(private readonly growwApiService: GrowwApiService) {}

  /**
   * Calculate ATM strike price based on current LTP
   * NIFTY strikes are in multiples of 50
   */
  calculateATMStrike(ltp: number, strikeIncrement: number = 50): number {
    return Math.round(ltp / strikeIncrement) * strikeIncrement
  }

  /**
   * Get next Tuesday expiry date
   */
  getNextTuesdayExpiry(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7
    const nextTuesday = new Date(today)
    nextTuesday.setDate(today.getDate() + (daysUntilTuesday === 0 ? 7 : daysUntilTuesday))
    
    const day = nextTuesday.getDate().toString().padStart(2, '0')
    const month = nextTuesday.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    const year = nextTuesday.getFullYear().toString().slice(-2)
    
    return `${day}${month}${year}`
  }

  /**
   * Generate option symbol in Groww format
   * Format: NIFTY + expiry + strike + CE/PE
   * Example: NIFTY25SEP24900PE
   */
  generateOptionSymbol(
    underlying: string,
    expiry: string,
    strike: number,
    optionType: 'CE' | 'PE'
  ): string {
    return `${underlying}${expiry}${strike}${optionType}`
  }

  /**
   * Calculate strikes based on configuration
   */
  async calculateStrikes(
    underlying: string,
    ltp: number,
    config: StrikeSelectionConfig
  ): Promise<OptionStrike[]> {
    const expiry = this.getNextTuesdayExpiry()
    const atmStrike = this.calculateATMStrike(ltp, config.strikeIncrement || 50)
    const strikes: OptionStrike[] = []

    // Process call strikes
    for (const strikeType of config.callStrikes) {
      const strike = this.getStrikeForType(strikeType, atmStrike, config.strikeIncrement || 50)
      const symbol = this.generateOptionSymbol(underlying, expiry, strike, 'CE')
      
      strikes.push({
        strike,
        type: 'CE',
        symbol,
        expiry,
        isATM: strike === atmStrike,
        isITM: strike < ltp,
        isOTM: strike > ltp
      })
    }

    // Process put strikes
    for (const strikeType of config.putStrikes) {
      const strike = this.getStrikeForType(strikeType, atmStrike, config.strikeIncrement || 50)
      const symbol = this.generateOptionSymbol(underlying, expiry, strike, 'PE')
      
      strikes.push({
        strike,
        type: 'PE',
        symbol,
        expiry,
        isATM: strike === atmStrike,
        isITM: strike > ltp,
        isOTM: strike < ltp
      })
    }

    return strikes
  }

  /**
   * Get strike price for a given type
   */
  private getStrikeForType(
    type: 'ATM' | 'ATM+1' | 'ATM-1' | 'OTM' | 'ITM',
    atmStrike: number,
    increment: number
  ): number {
    switch (type) {
      case 'ATM':
        return atmStrike
      case 'ATM+1':
        return atmStrike + increment
      case 'ATM-1':
        return atmStrike - increment
      case 'OTM':
        // For calls: higher than ATM, for puts: lower than ATM
        // We'll use ATM+1 for calls and ATM-1 for puts
        return atmStrike + increment
      case 'ITM':
        // For calls: lower than ATM, for puts: higher than ATM
        // We'll use ATM-1 for calls and ATM+1 for puts
        return atmStrike - increment
      default:
        return atmStrike
    }
  }

  /**
   * Validate option symbols exist in market
   */
  async validateOptionSymbols(symbols: string[]): Promise<{ valid: string[], invalid: string[] }> {
    const valid: string[] = []
    const invalid: string[] = []

    for (const symbol of symbols) {
      try {
        const quote = await this.growwApiService.getQuote(symbol)
        if (quote && quote.ltp) {
          valid.push(symbol)
        } else {
          invalid.push(symbol)
        }
      } catch (error) {
        this.logger.warn(`Failed to validate option symbol ${symbol}:`, error)
        invalid.push(symbol)
      }
    }

    return { valid, invalid }
  }

  /**
   * Get option chain data for a given underlying
   */
  async getOptionChain(underlying: string): Promise<any> {
    try {
      // This would need to be implemented in GrowwApiService
      // For now, return mock data structure
      return {
        underlying,
        expiry: this.getNextTuesdayExpiry(),
        strikes: [],
        calls: [],
        puts: []
      }
    } catch (error) {
      this.logger.error(`Failed to get option chain for ${underlying}:`, error)
      throw error
    }
  }
}
