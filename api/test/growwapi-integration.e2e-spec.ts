import { GrowwAPI } from 'growwapi'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.development' })

describe('GrowwAPI Integration (e2e)', () => {
  let groww: GrowwAPI

  beforeAll(async () => {
    // Check if we have the required credentials
    const hasApiKey = !!process.env.GROWW_API_KEY
    const hasAccessToken = !!process.env.GROWW_ACCESS_TOKEN

    console.log('GrowwAPI Credentials Check:')
    console.log('- API Key:', hasApiKey ? '✅ Present' : '❌ Missing')
    console.log('- Access Token:', hasAccessToken ? '✅ Present' : '❌ Missing')

    if (!hasApiKey || !hasAccessToken) {
      console.log('❌ Skipping tests - missing required credentials')
      return
    }

    groww = new GrowwAPI()
  })

  const symbol = 'RELIANCE'

  it('should get quote using growwapi', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log(`📈 Testing quote for symbol: ${symbol}`)
    
    const quote = await groww.liveData.getQuote({
      tradingSymbol: symbol,
      exchange: 'NSE'
    })
    
    console.log('📊 Quote response:', JSON.stringify(quote, null, 2))
    
    expect(quote).toBeDefined()
    expect(quote.lastPrice).toBeGreaterThan(0)
  }, 15000)

  it('should get historical data using growwapi', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log(`📈 Testing historical data for symbol: ${symbol}`)
    
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const to = new Date()
    
    const historicalData = await groww.historicData.get({
      tradingSymbol: symbol,
      exchange: 'NSE',
      from: from.toISOString(),
      to: to.toISOString()
    })
    
    console.log(`📊 Historical data: ${historicalData.candles?.length || 0} candles received`)
    if (historicalData.candles && historicalData.candles.length > 0) {
      console.log('📊 Sample candle:', JSON.stringify(historicalData.candles[0], null, 2))
    }
    
    expect(historicalData).toBeDefined()
    if (historicalData.candles) {
      expect(Array.isArray(historicalData.candles)).toBe(true)
    }
  }, 20000)

  it('should get holdings using growwapi', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log('📈 Testing holdings data')
    
    const holdings = await groww.holdings.list()
    
    console.log(`📊 Holdings: ${holdings.holdings?.length || 0} holdings received`)
    if (holdings.holdings && holdings.holdings.length > 0) {
      console.log('📊 Sample holding:', JSON.stringify(holdings.holdings[0], null, 2))
    }
    
    expect(holdings).toBeDefined()
    if (holdings.holdings) {
      expect(Array.isArray(holdings.holdings)).toBe(true)
    }
  }, 15000)

  it('should get positions using growwapi', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log('📈 Testing positions data')
    
    const positions = await groww.positions.user({})
    
    console.log(`📊 Positions: ${positions.positions?.length || 0} positions received`)
    if (positions.positions && positions.positions.length > 0) {
      console.log('📊 Sample position:', JSON.stringify(positions.positions[0], null, 2))
    }
    
    expect(positions).toBeDefined()
    if (positions.positions) {
      expect(Array.isArray(positions.positions)).toBe(true)
    }
  }, 15000)

  it('should get margin details using growwapi', async () => {
    if (!process.env.GROWW_API_KEY || !process.env.GROWW_ACCESS_TOKEN) {
      console.log('⏭️ Skipping - missing credentials')
      return
    }

    console.log('📈 Testing margin details')
    
    const margins = await groww.margins.details()
    
    console.log('📊 Margin details:', JSON.stringify(margins, null, 2))
    
    expect(margins).toBeDefined()
  }, 15000)
})
