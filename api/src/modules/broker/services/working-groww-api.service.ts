import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import * as crypto from 'crypto'

export interface GrowwHolding {
  isin: string
  trading_symbol: string
  quantity: number
  average_price: number
  pledge_quantity: number
  demat_locked_quantity: number
  groww_locked_quantity: number
  repledge_quantity: number
  t1_quantity: number
  demat_quantity: number
  available_quantity: number
  current_price?: number
  current_value?: number
  pnl?: number
  pnl_percentage?: number
}

export interface GrowwPosition {
  trading_symbol: string
  segment: string
  credit_quantity: number
  credit_price: number
  debit_quantity: number
  debit_price: number
  carry_forward_credit_quantity: number
  carry_forward_credit_price: number
  carry_forward_debit_quantity: number
  carry_forward_debit_price: number
  net_quantity: number
  net_price: number
  net_value: number
  pnl: number
  pnl_percentage: number
}

@Injectable()
export class WorkingGrowwApiService {
  private readonly logger = new Logger(WorkingGrowwApiService.name)
  private readonly httpClient: AxiosInstance
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      baseURL: 'https://api.groww.in',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'X-API-VERSION': '1.0'
      }
    })
  }

  /**
   * Get fresh access token using the working method from our test
   */
  private async getFreshAccessToken(): Promise<string> {
    try {
      const apiKey = this.configService.get<string>('GROWW_API_KEY')
      const apiSecret = this.configService.get<string>('GROWW_API_SECRET')

      if (!apiKey || !apiSecret) {
        throw new Error('GROWW_API_KEY or GROWW_API_SECRET not configured')
      }

      // Generate checksum (same method as working test)
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const input = apiSecret + timestamp
      const checksum = crypto.createHash('sha256').update(input).digest('hex')

      this.logger.log('🔑 Getting fresh access token...')

      const authResponse = await axios.post(
        'https://api.groww.in/v1/token/api/access',
        {
          key_type: 'approval',
          checksum: checksum,
          timestamp: timestamp
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const accessToken = authResponse.data.token
      this.accessToken = accessToken
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000) // 55 minutes
      
      // Set authorization header for future requests
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      this.logger.log('✅ Fresh access token obtained!')
      return accessToken

    } catch (error) {
      this.logger.error('❌ Failed to get access token:', error.message)
      throw new Error(`Failed to get access token: ${error.message}`)
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.getFreshAccessToken()
    }
  }

  /**
   * Get user holdings using the working API approach
   */
  async getHoldings(): Promise<GrowwHolding[]> {
    try {
      await this.ensureValidToken()
      
      this.logger.log('📊 Fetching user holdings...')
      
      const response = await this.httpClient.get('/v1/holdings/user')
      
      if (response.data.status === 'SUCCESS' && response.data.payload?.holdings) {
        const holdings = response.data.payload.holdings
        this.logger.log(`✅ Retrieved ${holdings.length} holdings`)
        
        // Calculate current values and PnL for each holding
        return holdings.map((holding: any) => ({
          isin: holding.isin,
          trading_symbol: holding.trading_symbol,
          quantity: holding.quantity,
          average_price: holding.average_price,
          pledge_quantity: holding.pledge_quantity || 0,
          demat_locked_quantity: holding.demat_locked_quantity || 0,
          groww_locked_quantity: holding.groww_locked_quantity || 0,
          repledge_quantity: holding.repledge_quantity || 0,
          t1_quantity: holding.t1_quantity || 0,
          demat_quantity: holding.demat_quantity || 0,
          available_quantity: holding.available_quantity || 0,
          current_price: holding.current_price,
          current_value: holding.current_price ? holding.quantity * holding.current_price : null,
          pnl: holding.current_price ? (holding.quantity * holding.current_price) - (holding.quantity * holding.average_price) : null,
          pnl_percentage: holding.current_price && holding.average_price ? 
            ((holding.current_price - holding.average_price) / holding.average_price) * 100 : null
        }))
      } else {
        this.logger.warn('⚠️ No holdings data in response')
        return []
      }
    } catch (error) {
      this.logger.error('❌ Failed to get holdings:', error.message)
      throw new Error(`Failed to get holdings: ${error.message}`)
    }
  }

  /**
   * Get user positions using the working API approach
   */
  async getPositions(): Promise<GrowwPosition[]> {
    try {
      await this.ensureValidToken()
      
      this.logger.log('📊 Fetching user positions...')
      
      const response = await this.httpClient.get('/v1/positions/user')
      
      if (response.data.status === 'SUCCESS' && response.data.payload?.positions) {
        const positions = response.data.payload.positions
        this.logger.log(`✅ Retrieved ${positions.length} positions`)
        return positions
      } else {
        this.logger.warn('⚠️ No positions data in response')
        return []
      }
    } catch (error) {
      this.logger.error('❌ Failed to get positions:', error.message)
      throw new Error(`Failed to get positions: ${error.message}`)
    }
  }

  /**
   * Get live quote for a symbol
   */
  async getQuote(symbol: string): Promise<any> {
    try {
      await this.ensureValidToken()
      
      this.logger.log(`📈 Fetching quote for ${symbol}...`)
      
      const response = await this.httpClient.get('/v1/live-data/quote', {
        params: {
          exchange: 'NSE',
          segment: 'CASH',
          trading_symbol: symbol
        }
      })
      
      if (response.data.status === 'SUCCESS' && response.data.payload) {
        this.logger.log(`✅ Retrieved quote for ${symbol}`)
        return response.data.payload
      } else {
        throw new Error('No quote data received')
      }
    } catch (error) {
      this.logger.error(`❌ Failed to get quote for ${symbol}:`, error.message)
      throw new Error(`Failed to get quote for ${symbol}: ${error.message}`)
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(symbol: string, startTime: string, endTime: string, intervalMinutes: number = 60): Promise<any[]> {
    try {
      await this.ensureValidToken()
      
      this.logger.log(`📊 Fetching historical data for ${symbol}...`)
      
      const response = await this.httpClient.get('/v1/historical/candle/range', {
        params: {
          exchange: 'NSE',
          segment: 'CASH',
          trading_symbol: symbol,
          start_time: startTime,
          end_time: endTime,
          interval_in_minutes: intervalMinutes.toString()
        }
      })
      
      if (response.data.status === 'SUCCESS' && response.data.payload?.candles) {
        const candles = response.data.payload.candles
        this.logger.log(`✅ Retrieved ${candles.length} historical candles for ${symbol}`)
        return candles
      } else {
        this.logger.warn(`⚠️ No historical data for ${symbol}`)
        return []
      }
    } catch (error) {
      this.logger.error(`❌ Failed to get historical data for ${symbol}:`, error.message)
      throw new Error(`Failed to get historical data for ${symbol}: ${error.message}`)
    }
  }

  /**
   * Get user margin details
   */
  async getUserMargins(): Promise<any> {
    try {
      await this.ensureValidToken()
      
      this.logger.log('💰 Fetching user margin details...')
      
      const response = await this.httpClient.get('/v1/margins/detail/user')
      
      if (response.data.status === 'SUCCESS' && response.data.payload) {
        this.logger.log('✅ Retrieved user margin details')
        return response.data.payload
      } else {
        throw new Error('No margin data received')
      }
    } catch (error) {
      this.logger.error('❌ Failed to get user margins:', error.message)
      throw new Error(`Failed to get user margins: ${error.message}`)
    }
  }

  /**
   * Calculate required margin for an order
   */
  async calculateRequiredMargin(orderData: any): Promise<any> {
    try {
      await this.ensureValidToken()
      
      this.logger.log('💰 Calculating required margin...')
      
      const response = await this.httpClient.post('/v1/margins/detail/orders', [orderData], {
        params: { segment: 'CASH' }
      })
      
      if (response.data.status === 'SUCCESS' && response.data.payload) {
        this.logger.log('✅ Calculated required margin')
        return response.data.payload
      } else {
        throw new Error('No margin calculation data received')
      }
    } catch (error) {
      this.logger.error('❌ Failed to calculate required margin:', error.message)
      throw new Error(`Failed to calculate required margin: ${error.message}`)
    }
  }
}




