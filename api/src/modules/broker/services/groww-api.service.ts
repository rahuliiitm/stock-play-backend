import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Redis } from 'ioredis'
import { Inject } from '@nestjs/common'

export interface GrowwCredentials {
  email: string
  password: string
  totpSecret?: string
}

export interface GrowwAuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface GrowwOrder {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price?: number
  triggerPrice?: number
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M' | 'BO' | 'CO' | 'ICEBERG' | 'OCO'
  productType: 'CNC' | 'MIS' | 'NRML'
  orderValidity?: 'DAY' | 'IOC' | 'GTD'
  disclosedQuantity?: number
  orderValidityDate?: string
}

export interface GrowwOrderResponse {
  orderId: string
  status: string
  message?: string
}

export interface GrowwPosition {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  averagePrice: number
  currentPrice?: number
  pnl?: number
  productType: string
}

@Injectable()
export class GrowwApiService {
  private readonly logger = new Logger(GrowwApiService.name)
  private readonly httpClient: AxiosInstance
  private readonly API_BASE_URL = 'https://groww.in/v1/api'
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {
    this.httpClient = axios.create({
      baseURL: this.API_BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StockPlay-Trading/1.0'
      }
    })

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Groww API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Authenticate with Groww API
   */
  async authenticate(credentials?: GrowwCredentials): Promise<boolean> {
    try {
      const creds = credentials || this.getCredentialsFromEnv()

      if (!creds) {
        throw new Error('Groww credentials not provided')
      }

      // Generate TOTP if secret is provided
      let totpCode: string | undefined
      if (creds.totpSecret) {
        totpCode = await this.generateTOTP(creds.totpSecret)
      }

      const loginPayload = {
        email: creds.email,
        password: creds.password,
        ...(totpCode && { totp: totpCode })
      }

      this.logger.log('Attempting Groww authentication...')
      const response: AxiosResponse<GrowwAuthResponse> = await this.httpClient.post(
        '/user/login',
        loginPayload
      )

      const authData = response.data
      this.accessToken = authData.access_token
      this.refreshToken = authData.refresh_token

      // Calculate token expiry
      const expiresIn = authData.expires_in || 3600 // Default 1 hour
      this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000))

      // Cache tokens in Redis
      await this.cacheTokens(authData)

      // Set authorization header for future requests
      this.httpClient.defaults.headers.common['Authorization'] = `${authData.token_type} ${authData.access_token}`

      this.logger.log('✅ Groww authentication successful')
      return true

    } catch (error) {
      this.logger.error('❌ Groww authentication failed:', error.message)
      return false
    }
  }

  /**
   * Place an order
   */
  async placeOrder(order: GrowwOrder): Promise<GrowwOrderResponse> {
    await this.ensureAuthenticated()

    try {
      const orderPayload = this.formatOrderPayload(order)

      this.logger.log(`📋 Placing ${order.side} order for ${order.symbol}`, {
        quantity: order.quantity,
        orderType: order.orderType,
        productType: order.productType
      })

      const response = await this.httpClient.post('/orders/place', orderPayload)

      const orderResponse: GrowwOrderResponse = {
        orderId: response.data.orderId || response.data.id,
        status: response.data.status || 'PENDING',
        message: response.data.message
      }

      this.logger.log(`✅ Order placed successfully: ${orderResponse.orderId}`)
      return orderResponse

    } catch (error) {
      this.logger.error(`❌ Failed to place order:`, error.message)
      throw new Error(`Order placement failed: ${error.message}`)
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(orderId: string, modifications: Partial<GrowwOrder>): Promise<GrowwOrderResponse> {
    await this.ensureAuthenticated()

    try {
      const modifyPayload = this.formatOrderPayload(modifications)

      this.logger.log(`🔧 Modifying order ${orderId}`)
      const response = await this.httpClient.put(`/orders/${orderId}`, modifyPayload)

      return {
        orderId,
        status: response.data.status || 'MODIFIED',
        message: response.data.message
      }

    } catch (error) {
      this.logger.error(`❌ Failed to modify order ${orderId}:`, error.message)
      throw new Error(`Order modification failed: ${error.message}`)
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<GrowwOrderResponse> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`❌ Cancelling order ${orderId}`)
      const response = await this.httpClient.delete(`/orders/${orderId}`)

      return {
        orderId,
        status: 'CANCELLED',
        message: response.data.message
      }

    } catch (error) {
      this.logger.error(`❌ Failed to cancel order ${orderId}:`, error.message)
      throw new Error(`Order cancellation failed: ${error.message}`)
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get(`/orders/${orderId}`)
      return response.data
    } catch (error) {
      this.logger.error(`❌ Failed to get order status for ${orderId}:`, error.message)
      throw new Error(`Failed to get order status: ${error.message}`)
    }
  }

  /**
   * Get all orders
   */
  async getOrders(status?: string): Promise<any[]> {
    await this.ensureAuthenticated()

    try {
      const params = status ? { status } : {}
      const response = await this.httpClient.get('/orders', { params })
      return response.data.orders || response.data
    } catch (error) {
      this.logger.error('❌ Failed to get orders:', error.message)
      throw new Error(`Failed to get orders: ${error.message}`)
    }
  }

  /**
   * Get current positions
   */
  async getPositions(): Promise<GrowwPosition[]> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get('/portfolio/positions')
      const positions = response.data.positions || response.data

      return positions.map(pos => ({
        symbol: pos.symbol || pos.trading_symbol,
        side: pos.side || (pos.quantity > 0 ? 'BUY' : 'SELL'),
        quantity: Math.abs(pos.quantity),
        averagePrice: pos.average_price || pos.avg_price,
        currentPrice: pos.current_price || pos.ltp,
        pnl: pos.pnl || pos.unrealized_pnl,
        productType: pos.product_type || pos.productType
      }))

    } catch (error) {
      this.logger.error('❌ Failed to get positions:', error.message)
      throw new Error(`Failed to get positions: ${error.message}`)
    }
  }

  /**
   * Get portfolio holdings
   */
  async getHoldings(): Promise<any[]> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get('/portfolio/holdings')
      return response.data.holdings || response.data
    } catch (error) {
      this.logger.error('❌ Failed to get holdings:', error.message)
      throw new Error(`Failed to get holdings: ${error.message}`)
    }
  }

  /**
   * Get account balance/margins
   */
  async getMargins(): Promise<any> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get('/user/margins')
      return response.data
    } catch (error) {
      this.logger.error('❌ Failed to get margins:', error.message)
      throw new Error(`Failed to get margins: ${error.message}`)
    }
  }

  /**
   * Get live quote for a symbol
   */
  async getQuote(symbol: string): Promise<any> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get(`/market/quote/${symbol}`)
      return response.data
    } catch (error) {
      this.logger.error(`❌ Failed to get quote for ${symbol}:`, error.message)
      throw new Error(`Failed to get quote: ${error.message}`)
    }
  }

  /**
   * Get historical data (for backtesting)
   */
  async getHistoricalData(symbol: string, fromDate: string, toDate: string, interval: string = '1D'): Promise<any[]> {
    await this.ensureAuthenticated()

    try {
      const params = {
        symbol,
        from_date: fromDate,
        to_date: toDate,
        interval
      }

      const response = await this.httpClient.get('/market/historical', { params })
      return response.data.candles || response.data
    } catch (error) {
      this.logger.error(`❌ Failed to get historical data for ${symbol}:`, error.message)
      throw new Error(`Failed to get historical data: ${error.message}`)
    }
  }

  /**
   * Private helper methods
   */
  private async ensureAuthenticated(): Promise<void> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      // Token is still valid
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
      return
    }

    // Try to load cached tokens
    const cachedTokens = await this.loadCachedTokens()
    if (cachedTokens && cachedTokens.expiry > new Date()) {
      this.accessToken = cachedTokens.accessToken
      this.refreshToken = cachedTokens.refreshToken
      this.tokenExpiry = cachedTokens.expiry
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
      return
    }

    // Need to authenticate
    const success = await this.authenticate()
    if (!success) {
      throw new Error('Failed to authenticate with Groww API')
    }
  }

  private getCredentialsFromEnv(): GrowwCredentials | null {
    const email = this.configService.get<string>('GROWW_EMAIL')
    const password = this.configService.get<string>('GROWW_PASSWORD')
    const totpSecret = this.configService.get<string>('GROWW_TOTP_SECRET')

    if (!email || !password) {
      return null
    }

    return {
      email,
      password,
      totpSecret
    }
  }

  private async generateTOTP(secret: string): Promise<string> {
    // This would use the otplib library
    // For now, return a placeholder
    this.logger.warn('TOTP generation not implemented - using placeholder')
    return '123456' // Placeholder
  }

  private formatOrderPayload(order: Partial<GrowwOrder>): any {
    return {
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      order_type: order.orderType,
      product_type: order.productType,
      order_validity: order.orderValidity || 'DAY',
      ...(order.price && { price: order.price }),
      ...(order.triggerPrice && { trigger_price: order.triggerPrice }),
      ...(order.disclosedQuantity && { disclosed_quantity: order.disclosedQuantity }),
      ...(order.orderValidityDate && { order_validity_date: order.orderValidityDate })
    }
  }

  private async cacheTokens(authData: GrowwAuthResponse): Promise<void> {
    const cacheData = {
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
      expiry: new Date(Date.now() + ((authData.expires_in || 3600) * 1000))
    }

    await this.redis.set(
      'groww:tokens',
      JSON.stringify(cacheData),
      'EX',
      authData.expires_in || 3600
    )
  }

  private async loadCachedTokens(): Promise<any> {
    try {
      const cached = await this.redis.get('groww:tokens')
      if (cached) {
        const data = JSON.parse(cached)
        data.expiry = new Date(data.expiry)
        return data
      }
    } catch (error) {
      this.logger.error('Failed to load cached tokens:', error.message)
    }
    return null
  }

  /**
   * Test connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      await this.ensureAuthenticated()

      // Try to get account info
      const response = await this.httpClient.get('/user/profile')
      return response.status === 200
    } catch (error) {
      this.logger.error('Connectivity test failed:', error.message)
      return false
    }
  }

  /**
   * Get API rate limits status
   */
  async getRateLimitStatus(): Promise<any> {
    // This would track API call rates
    // For now, return placeholder
    return {
      remaining: 100,
      resetTime: new Date(Date.now() + 60000)
    }
  }
}
