import { GrowwSource } from '../src/lib/market-data-sdk/sources/groww'
import axios from 'axios'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.development' })

describe('Groww Real API Integration (e2e)', () => {
  let growwSource: GrowwSource

  beforeAll(async () => {
    // Check if we have the required credentials
    const hasApiKey = !!process.env.GROWW_API_KEY
    const hasAccessToken = !!process.env.GROWW_ACCESS_TOKEN
    const hasSecret = !!process.env.GROWW_API_SECRET

    console.log('Groww Credentials Check:')
    console.log('- API Key:', hasApiKey ? '✅ Present' : '❌ Missing')
    console.log('- Access Token:', hasAccessToken ? '✅ Present' : '❌ Missing')
    console.log('- API Secret:', hasSecret ? '✅ Present' : '❌ Missing')

    if (!hasApiKey || (!hasAccessToken && !hasSecret)) {
      console.log('❌ Skipping tests - missing required credentials')
      return
    }

    // Create HTTP client
    const httpGet = async (url: string, options?: any) => {
      console.log(`🌐 Making GET request to: ${url}`)
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'X-API-VERSION': '1.0',
          'X-API-KEY': process.env.GROWW_API_KEY,
          'Authorization': `Bearer ${process.env.GROWW_ACCESS_TOKEN}`,
          ...options?.headers,
        },
        params: options?.params,
      })
      console.log(`✅ Response status: ${response.status}`)
      return response.data
    }

    const httpPost = async (url: string, data?: any, options?: any) => {
      console.log(`🌐 Making POST request to: ${url}`)
      const response = await axios.post(url, data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-VERSION': '1.0',
          'X-API-KEY': process.env.GROWW_API_KEY,
          'Authorization': `Bearer ${process.env.GROWW_ACCESS_TOKEN}`,
          ...options?.headers,
        },
      })
      console.log(`✅ Response status: ${response.status}`)
      return response.data
    }

    growwSource = new GrowwSource({
      httpGet,
      httpPost,
      getAccessToken: async () => process.env.GROWW_ACCESS_TOKEN || null,
      baseUrl: process.env.GROWW_API_BASE || 'https://api.groww.in',
      apiKey: process.env.GROWW_API_KEY,
      appId: process.env.GROWW_APP_ID,
    })
  })

  const symbol = 'RELIANCE'

  it('should get real quote data from Groww API', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log(`📈 Testing quote for symbol: ${symbol}`)
    
    const quote = await growwSource.getQuote(symbol)
    
    console.log('📊 Quote response:', JSON.stringify(quote, null, 2))
    
    expect(quote).toHaveProperty('symbol', symbol)
    expect(typeof quote.price).toBe('number')
    expect(quote.price).toBeGreaterThan(0)
    expect(quote.source).toBe('groww')
  }, 15000)

  it('should get real historical data from Groww API', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log(`📈 Testing historical data for symbol: ${symbol}`)
    
    const candles = await growwSource.getHistory(symbol, undefined, undefined, 1440)
    
    console.log(`📊 Historical data: ${candles.length} candles received`)
    if (candles.length > 0) {
      console.log('📊 Sample candle:', JSON.stringify(candles[0], null, 2))
    }
    
    expect(Array.isArray(candles)).toBe(true)
    if (candles.length > 0) {
      expect(candles[0]).toHaveProperty('time')
      expect(candles[0]).toHaveProperty('open')
      expect(candles[0]).toHaveProperty('high')
      expect(candles[0]).toHaveProperty('low')
      expect(candles[0]).toHaveProperty('close')
      expect(candles[0]).toHaveProperty('volume')
    }
  }, 20000)

  it('should get real holdings data from Groww API', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log('📈 Testing holdings data')
    
    const holdings = await growwSource.getHoldings()
    
    console.log(`📊 Holdings data: ${holdings.length} holdings received`)
    if (holdings.length > 0) {
      console.log('📊 Sample holding:', JSON.stringify(holdings[0], null, 2))
    }
    
    expect(Array.isArray(holdings)).toBe(true)
    if (holdings.length > 0) {
      expect(holdings[0]).toHaveProperty('symbol')
      expect(holdings[0]).toHaveProperty('quantity')
      expect(holdings[0]).toHaveProperty('avgPrice')
    }
  }, 15000)

  it('should get real positions data from Groww API', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log('📈 Testing positions data')
    
    const positions = await growwSource.getPositions()
    
    console.log(`📊 Positions data: ${positions.length} positions received`)
    if (positions.length > 0) {
      console.log('📊 Sample position:', JSON.stringify(positions[0], null, 2))
    }
    
    expect(Array.isArray(positions)).toBe(true)
  }, 15000)
})
