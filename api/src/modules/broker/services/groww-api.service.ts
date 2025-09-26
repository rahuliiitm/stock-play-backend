import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Redis } from 'ioredis'
import { Inject } from '@nestjs/common'

export interface GrowwCredentials {
  email?: string
  password?: string
  totpSecret?: string
  apiKey?: string
  apiSecret?: string
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
  private readonly API_BASE_URL = 'https://api.groww.in'
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: Date | null = null

  /**
   * Set access token for this instance
   */
  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken
    this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  /**
   * Static method to get access token (similar to Python SDK's GrowwAPI.get_access_token)
   * Usage: const accessToken = await GrowwApiService.getAccessToken(apiKey, apiSecret)
   */
  static async getAccessToken(apiKey: string, apiSecret: string): Promise<string> {
    const crypto = await import('crypto')
    const axios = await import('axios')
    
    // Generate checksum as per Groww API documentation
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const input = apiSecret + timestamp
    const checksum = crypto.createHash('sha256').update(input).digest('hex')
    
      const response = await axios.default.post(
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

    return response.data.token
  }

  constructor(
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {
    this.httpClient = axios.create({
      baseURL: this.API_BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-VERSION': '1.0',
        'User-Agent': 'StockPlay-Trading/1.0'
      }
    })

    // Access token will be set via setAccessToken method when needed

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
   * Authenticate with Groww API using API key or username/password
   */
  async authenticate(credentials?: GrowwCredentials): Promise<boolean> {
    try {
      const creds = credentials || this.getCredentialsFromEnv()

      if (!creds) {
        throw new Error('Groww credentials not provided')
      }

      // Try direct access token first
      if (creds.apiKey === 'direct_token') {
        this.logger.log('✅ Using direct access token authentication')
        return true
      }

      // Try API key authentication (Groww API Key + Secret Flow)
      if (creds.apiKey && creds.apiSecret) {
        return await this.authenticateWithApiKey(creds.apiKey, creds.apiSecret)
      }

      // Fallback to username/password authentication
      if (creds.email && creds.password) {
        return await this.authenticateWithCredentials(creds)
      }

      throw new Error('No valid authentication method provided')

    } catch (error) {
      this.logger.error('❌ Groww authentication failed:', error.message)
      return false
    }
  }

  /**
   * Get access token using API key and secret (similar to Python SDK's get_access_token)
   * This is the TypeScript equivalent of: GrowwAPI.get_access_token(api_key=api_key, secret=secret)
   */
  async getAccessToken(apiKey: string, apiSecret: string): Promise<string> {
    try {
      this.logger.log('🔑 Getting access token using TOTP flow...')
      
      // Generate TOTP using the API secret as base32
      const totp = await this.generateTOTP(apiSecret)
      this.logger.log(`🔐 TOTP Generated: ${totp}`)
      
      const response: AxiosResponse<any> = await this.httpClient.post(
        '/v1/token/api/access',
        {
          key_type: 'totp',
          totp: totp
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const authData = response.data
      const accessToken = authData.token
      
      this.logger.log('✅ Access token obtained successfully via TOTP flow')
      this.logger.log(`Token Ref ID: ${authData.tokenRefId}`)
      this.logger.log(`Session Name: ${authData.sessionName}`)
      this.logger.log(`Expires At: ${authData.expiry}`)
      this.logger.log(`Is Active: ${authData.isActive}`)

      return accessToken

    } catch (error) {
      this.logger.error('❌ Failed to get access token:', error.message)
      if (error.response) {
        this.logger.error('Response data:', error.response.data)
      }
      throw new Error(`Failed to get access token: ${error.message}`)
    }
  }

  /**
   * Authenticate using API key and secret (Groww API Key + Secret Flow)
   * This is the TypeScript equivalent of: growwapi = GrowwAPI(access_token)
   */
  private async authenticateWithApiKey(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      this.logger.log('Attempting Groww API key authentication...')
      
      // Get access token (similar to Python SDK)
      const accessToken = await this.getAccessToken(apiKey, apiSecret)
      
      // Set the access token for this instance (similar to Python SDK initialization)
      this.accessToken = accessToken
      
      // Calculate expiry (tokens expire at 6AM every day as per documentation)
      const now = new Date()
      const tomorrow6AM = new Date(now)
      tomorrow6AM.setDate(tomorrow6AM.getDate() + 1)
      tomorrow6AM.setHours(6, 0, 0, 0)
      this.tokenExpiry = tomorrow6AM

      // Cache tokens in Redis
      await this.cacheTokens({
        access_token: accessToken,
        refresh_token: '', // Not provided in this flow
        token_type: 'Bearer',
        expires_in: Math.floor((this.tokenExpiry.getTime() - Date.now()) / 1000)
      })

      // Set authorization header for future requests
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

      this.logger.log('✅ Groww API key authentication successful')
      this.logger.log(`Token expires at: ${this.tokenExpiry.toISOString()}`)
      return true

    } catch (error) {
      this.logger.error('❌ Groww API key authentication failed:', error.message)
      return false
    }
  }

  /**
   * Authenticate using username/password
   */
  private async authenticateWithCredentials(creds: GrowwCredentials): Promise<boolean> {
    try {
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

      this.logger.log('Attempting Groww username/password authentication...')
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

      this.logger.log('✅ Groww username/password authentication successful')
      return true

    } catch (error) {
      this.logger.error('❌ Groww username/password authentication failed:', error.message)
      return false
    }
  }

  /**
   * Place an order using official Groww API
   */
  async placeOrder(order: GrowwOrder): Promise<GrowwOrderResponse> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📋 Placing ${order.side} order for ${order.symbol}`, {
        quantity: order.quantity,
        orderType: order.orderType,
        productType: order.productType
      })

      const orderPayload = {
        trading_symbol: order.symbol,
        quantity: order.quantity,
        price: order.price || 0,
        trigger_price: order.triggerPrice || 0,
        validity: order.orderValidity || 'DAY',
        exchange: 'NSE',
        segment: 'CASH',
        product: order.productType,
        order_type: order.orderType,
        transaction_type: order.side,
        order_reference_id: `ORD${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      }

      const response = await this.httpClient.post('/v1/order/create', orderPayload)

      const orderResponse: GrowwOrderResponse = {
        orderId: response.data.payload.groww_order_id,
        status: response.data.payload.order_status,
        message: response.data.payload.remark
      }

      this.logger.log(`✅ Order placed successfully: ${orderResponse.orderId}`)
      return orderResponse

    } catch (error) {
      this.logger.error(`❌ Failed to place order:`, error.message)
      throw new Error(`Order placement failed: ${error.message}`)
    }
  }

  /**
   * Modify an existing order using official Groww API
   */
  async modifyOrder(orderId: string, modifications: Partial<GrowwOrder>): Promise<GrowwOrderResponse> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📝 Modifying order ${orderId}`, modifications)

      const modifyPayload = {
        groww_order_id: orderId,
        segment: 'CASH',
        quantity: modifications.quantity,
        price: modifications.price,
        trigger_price: modifications.triggerPrice,
        order_type: modifications.orderType
      }

      const response = await this.httpClient.post('/v1/order/modify', modifyPayload)

      const orderResponse: GrowwOrderResponse = {
        orderId: response.data.payload.groww_order_id,
        status: response.data.payload.order_status,
        message: 'Order modified successfully'
      }

      this.logger.log(`✅ Order modified successfully: ${orderResponse.orderId}`)
      return orderResponse

    } catch (error) {
      this.logger.error(`❌ Failed to modify order ${orderId}:`, error.message)
      throw new Error(`Order modification failed: ${error.message}`)
    }
  }

  /**
   * Cancel an order using official Groww API
   */
  async cancelOrder(orderId: string): Promise<GrowwOrderResponse> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`❌ Cancelling order ${orderId}`)
      
      const cancelPayload = {
        segment: 'CASH',
        groww_order_id: orderId
      }

      const response = await this.httpClient.post('/v1/order/cancel', cancelPayload)

      const orderResponse: GrowwOrderResponse = {
        orderId: response.data.payload.groww_order_id,
        status: response.data.payload.order_status,
        message: 'Order cancelled successfully'
      }

      this.logger.log(`✅ Order cancelled successfully: ${orderResponse.orderId}`)
      return orderResponse

    } catch (error) {
      this.logger.error(`❌ Failed to cancel order ${orderId}:`, error.message)
      throw new Error(`Order cancellation failed: ${error.message}`)
    }
  }

  /**
   * Get order details using official Groww API
   */
  async getOrderDetails(orderId: string): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📋 Getting order details for ${orderId}`)
      
      const response = await this.httpClient.get(`/v1/order/detail/${orderId}`, {
        params: { segment: 'CASH' }
      })
      
      this.logger.log(`✅ Order details retrieved for ${orderId}`)
      return response.data.payload
    } catch (error) {
      this.logger.error(`❌ Failed to get order details for ${orderId}:`, error.message)
      throw new Error(`Failed to get order details: ${error.message}`)
    }
  }

  /**
   * Get order list using official Groww API
   */
  async getOrderList(page: number = 0, pageSize: number = 50): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📋 Getting order list - page ${page}, size ${pageSize}`)
      
      const response = await this.httpClient.get('/v1/order/list', {
        params: { 
          segment: 'CASH',
          page: page,
          page_size: pageSize
        }
      })
      
      this.logger.log(`✅ Order list retrieved - ${response.data.payload?.orders?.length || 0} orders`)
      return response.data.payload
    } catch (error) {
      this.logger.error(`❌ Failed to get order list:`, error.message)
      throw new Error(`Failed to get order list: ${error.message}`)
    }
  }

  /**
   * Get order list without authentication check (for scheduler)
   */
  async getOrderListDirect(page: number = 0, pageSize: number = 50): Promise<any> {
    try {
      this.logger.log(`📋 Getting order list - page ${page}, size ${pageSize}`)
      
      const response = await this.httpClient.get('/v1/order/list', {
        params: { 
          segment: 'CASH',
          page: page,
          page_size: pageSize
        }
      })
      
      this.logger.log(`✅ Order list retrieved - ${response.data.payload?.orders?.length || 0} orders`)
      return response.data.payload
    } catch (error) {
      this.logger.error(`❌ Failed to get order list:`, error.message)
      throw new Error(`Failed to get order list: ${error.message}`)
    }
  }

  /**
   * Get trades for an order using official Groww API
   */
  async getOrderTrades(orderId: string, page: number = 0, pageSize: number = 50): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📋 Getting trades for order ${orderId}`)
      
      const response = await this.httpClient.get(`/v1/order/trades/${orderId}`, {
        params: { 
          segment: 'CASH',
          page: page,
          page_size: pageSize
        }
      })
      
      this.logger.log(`✅ Trades retrieved for order ${orderId} - ${response.data.payload?.trade_list?.length || 0} trades`)
      return response.data.payload
    } catch (error) {
      this.logger.error(`❌ Failed to get trades for order ${orderId}:`, error.message)
      throw new Error(`Failed to get order trades: ${error.message}`)
    }
  }

  /**
   * Get order status (alias for getOrderDetails for backward compatibility)
   */
  async getOrderStatus(orderId: string): Promise<any> {
    return this.getOrderDetails(orderId)
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
   * Based on: https://groww.in/trade-api/docs/curl/portfolio
   */
  async getPositions(): Promise<GrowwPosition[]> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get('/v1/positions/user')
      const positions = response.data.payload?.positions || []

      return positions.map(pos => ({
        symbol: pos.trading_symbol,
        side: pos.quantity > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(pos.quantity),
        averagePrice: pos.net_price || pos.net_carry_forward_price,
        currentPrice: undefined, // Not provided in positions API
        pnl: undefined, // Not provided in positions API
        productType: pos.product
      }))

    } catch (error) {
      this.logger.error('❌ Failed to get positions:', error.message)
      throw new Error(`Failed to get positions: ${error.message}`)
    }
  }

  /**
   * Get current positions without authentication check (for scheduler)
   */
  async getPositionsDirect(): Promise<GrowwPosition[]> {
    try {
      const response = await this.httpClient.get('/v1/positions/user')
      const positions = response.data.payload?.positions || []

      return positions.map(pos => ({
        symbol: pos.trading_symbol,
        side: pos.quantity > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(pos.quantity),
        averagePrice: pos.net_price || pos.net_carry_forward_price,
        currentPrice: undefined, // Not provided in positions API
        pnl: undefined, // Not provided in positions API
        productType: pos.product
      }))

    } catch (error) {
      this.logger.error('❌ Failed to get positions:', error.message)
      throw new Error(`Failed to get positions: ${error.message}`)
    }
  }

  /**
   * Get position for a specific trading symbol
   * Based on: https://groww.in/trade-api/docs/curl/portfolio
   */
  async getPositionForSymbol(tradingSymbol: string, segment: string = 'CASH'): Promise<GrowwPosition[]> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get('/v1/positions/trading-symbol', {
        params: {
          trading_symbol: tradingSymbol,
          segment: segment
        }
      })
      const positions = response.data.payload?.positions || []

      return positions.map(pos => ({
        symbol: pos.trading_symbol,
        side: pos.quantity > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(pos.quantity),
        averagePrice: pos.net_price || pos.net_carry_forward_price,
        currentPrice: undefined, // Not provided in positions API
        pnl: undefined, // Not provided in positions API
        productType: pos.product
      }))

    } catch (error) {
      this.logger.error(`❌ Failed to get position for ${tradingSymbol}:`, error.message)
      throw new Error(`Failed to get position for symbol: ${error.message}`)
    }
  }

  /**
   * Get portfolio holdings
   * Based on: https://groww.in/trade-api/docs/curl/portfolio
   */
  async getHoldings(): Promise<any[]> {
    await this.ensureAuthenticated()

    try {
      const response = await this.httpClient.get('/v1/holdings/user')
      return response.data.payload?.holdings || []
    } catch (error) {
      this.logger.error('❌ Failed to get holdings:', error.message)
      throw new Error(`Failed to get holdings: ${error.message}`)
    }
  }

  /**
   * Get portfolio holdings without authentication check (for scheduler)
   */
  async getHoldingsDirect(): Promise<any[]> {
    try {
      const response = await this.httpClient.get('/v1/holdings/user')
      return response.data.payload?.holdings || []
    } catch (error) {
      this.logger.error('❌ Failed to get holdings:', error.message)
      throw new Error(`Failed to get holdings: ${error.message}`)
    }
  }

  /**
   * Get Last Traded Price (LTP) for multiple symbols
   */
  async getLTP(symbols: string[]): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📈 Getting LTP for ${symbols.length} symbols`)
      
      const exchangeSymbols = symbols.map(symbol => `NSE_${symbol}`).join(',')
      
      const response = await this.httpClient.get('/v1/live-data/ltp', {
        params: {
          segment: 'CASH',
          exchange_symbols: exchangeSymbols
        }
      })
      
      this.logger.log(`✅ LTP received for ${symbols.length} symbols`)
      return response.data.payload
    } catch (error) {
      this.logger.error('❌ Failed to get LTP:', error.message)
      throw new Error(`Failed to get LTP: ${error.message}`)
    }
  }

  /**
   * Get OHLC data for multiple symbols
   */
  async getOHLC(symbols: string[]): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📊 Getting OHLC for ${symbols.length} symbols`)
      
      const exchangeSymbols = symbols.map(symbol => `NSE_${symbol}`).join(',')
      
      const response = await this.httpClient.get('/v1/live-data/ohlc', {
        params: {
          segment: 'CASH',
          exchange_symbols: exchangeSymbols
        }
      })
      
      this.logger.log(`✅ OHLC received for ${symbols.length} symbols`)
      return response.data.payload
    } catch (error) {
      this.logger.error('❌ Failed to get OHLC:', error.message)
      throw new Error(`Failed to get OHLC: ${error.message}`)
    }
  }

  /**
   * Get available user margin details using official Groww API
   */
  async getMargins(): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log('💰 Getting user margin details')
      
      const response = await this.httpClient.get('/v1/margins/detail/user')
      
      this.logger.log('✅ User margin details received')
      return response.data.payload
    } catch (error) {
      this.logger.error('❌ Failed to get user margins:', error.message)
      throw new Error(`Failed to get user margins: ${error.message}`)
    }
  }

  /**
   * Calculate required margin for orders using official Groww API
   */
  async calculateRequiredMargin(orders: any[], segment: string = 'CASH'): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`💰 Calculating required margin for ${orders.length} orders`)
      
      const response = await this.httpClient.post(`/v1/margins/detail/orders?segment=${segment}`, orders)
      
      this.logger.log('✅ Required margin calculated')
      return response.data.payload
    } catch (error) {
      this.logger.error('❌ Failed to calculate required margin:', error.message)
      throw new Error(`Failed to calculate required margin: ${error.message}`)
    }
  }


  /**
   * Get live quote for a symbol using official Groww API
   */
  async getQuote(symbol: string): Promise<any> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📈 Getting quote for ${symbol}`)
      
      const response = await this.httpClient.get('/v1/live-data/quote', {
        params: {
          exchange: 'NSE',
          segment: 'CASH',
          trading_symbol: symbol
        }
      })
      
      const quote = response.data.payload
      this.logger.log(`✅ Quote received for ${symbol}: ₹${quote.last_price}`)
      return quote
    } catch (error) {
      this.logger.error(`❌ Failed to get quote for ${symbol}:`, error.message)
      throw new Error(`Failed to get quote: ${error.message}`)
    }
  }

  /**
   * Get historical data using official Groww API
   */
  async getHistoricalData(symbol: string, fromDate: string, toDate: string, interval: string = '1D'): Promise<any[]> {
    await this.ensureAuthenticated()

    try {
      this.logger.log(`📊 Getting historical data for ${symbol} from ${fromDate} to ${toDate}`)
      
      // Convert interval to minutes (1D = 1440 minutes)
      const intervalMap: { [key: string]: string } = {
        '1D': '1440',
        '1H': '60',
        '4H': '240',
        '1W': '10080',
        '1M': '1',
        '5M': '5',
        '15M': '15',
        '30M': '30'
      }
      
      const intervalMinutes = intervalMap[interval] || '1440'
      
      const response = await this.httpClient.get('/v1/historical/candle/bulk', {
        params: {
          exchange: 'NSE',
          segment: 'CASH',
          groww_symbol: `NSE-${symbol}`,
          start_time: fromDate,
          end_time: toDate,
          interval_in_minutes: intervalMinutes
        }
      })
      
      const candles = response.data.payload?.candles || []
      this.logger.log(`✅ Historical data received for ${symbol}: ${candles.length} candles`)
      return candles
    } catch (error) {
      this.logger.error(`❌ Failed to get historical data for ${symbol}:`, error.message)
      throw new Error(`Failed to get historical data: ${error.message}`)
    }
  }

  /**
   * Private helper methods
   */
  private async ensureAuthenticated(): Promise<void> {
    // If an access token is provided via env, prefer it
    const envAccessToken = this.configService.get<string>('GROWW_ACCESS_TOKEN')
    if (envAccessToken) {
      this.accessToken = envAccessToken
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000) // assume ~55m validity
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
      return
    }

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
    const apiKey = this.configService.get<string>('GROWW_API_KEY')
    const apiSecret = this.configService.get<string>('GROWW_API_SECRET')
    const accessToken = this.configService.get<string>('GROWW_ACCESS_TOKEN')

    // Prioritize direct access token (Groww Access Token approach)
    if (accessToken) {
      this.accessToken = accessToken
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000) // Assume ~55m validity
      this.httpClient.defaults.headers.common['Authorization'] = accessToken
      return { apiKey: 'direct_token' } // Special flag for direct token usage
    }

    // Try API key authentication (Groww API Key + Secret Flow)
    if (apiKey && apiSecret && apiKey !== 'your_actual_api_key_from_groww_execute_page') {
      return {
        apiKey,
        apiSecret
      }
    }

    // Fallback to username/password
    if (email && password) {
      return {
        email,
        password,
        totpSecret
      }
    }

    return null
  }

  private async generateTOTP(secret: string): Promise<string> {
    try {
      const { authenticator } = await import('otplib')
      return authenticator.generate(secret)
    } catch (e) {
      this.logger.error('Failed to generate TOTP:', (e as any)?.message)
      throw e
    }
  }

  /**
   * Generate checksum for Groww API authentication
   * Based on: https://groww.in/trade-api/docs/curl
   */
  private async generateChecksum(secret: string, timestamp: string): Promise<string> {
    try {
      const crypto = await import('crypto')
      const input = secret + timestamp
      return crypto.createHash('sha256').update(input).digest('hex')
    } catch (e) {
      this.logger.error('Failed to generate checksum:', (e as any)?.message)
      throw e
    }
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
