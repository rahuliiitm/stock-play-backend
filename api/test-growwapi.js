const { GrowwAPI } = require('growwapi')
require('dotenv').config({ path: '.env.development' })

async function testGrowwAPI() {
  console.log('🧪 Testing GrowwAPI Integration...')
  
  // Check credentials
  const hasApiKey = !!process.env.GROWW_API_KEY
  const hasAccessToken = !!process.env.GROWW_ACCESS_TOKEN

  console.log('GrowwAPI Credentials Check:')
  console.log('- API Key:', hasApiKey ? '✅ Present' : '❌ Missing')
  console.log('- Access Token:', hasAccessToken ? '✅ Present' : '❌ Missing')

  if (!hasApiKey || !hasAccessToken) {
    console.log('❌ Skipping tests - missing required credentials')
    return
  }

  try {
    // Initialize GrowwAPI
    const groww = new GrowwAPI()
    console.log('✅ GrowwAPI instantiated successfully')

    // Test 1: Check if modules are available
    console.log('\n📋 Testing module availability:')
    console.log('- liveData:', !!groww.liveData ? '✅' : '❌')
    console.log('- historicData:', !!groww.historicData ? '✅' : '❌')
    console.log('- holdings:', !!groww.holdings ? '✅' : '❌')
    console.log('- positions:', !!groww.positions ? '✅' : '❌')
    console.log('- margins:', !!groww.margins ? '✅' : '❌')
    console.log('- orders:', !!groww.orders ? '✅' : '❌')
    console.log('- liveFeed:', !!groww.liveFeed ? '✅' : '❌')

    // Test 2: Get quote
    console.log('\n📈 Testing quote for RELIANCE:')
    const quote = await groww.liveData.getQuote({
      tradingSymbol: 'RELIANCE',
      exchange: 'NSE'
    })
    console.log('✅ Quote received:', JSON.stringify(quote, null, 2))

    // Test 3: Get historical data
    console.log('\n📊 Testing historical data for RELIANCE:')
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const to = new Date()
    
    const historicalData = await groww.historicData.get({
      tradingSymbol: 'RELIANCE',
      exchange: 'NSE',
      from: from.toISOString(),
      to: to.toISOString()
    })
    console.log(`✅ Historical data received: ${historicalData.candles?.length || 0} candles`)

    // Test 4: Get holdings
    console.log('\n💼 Testing holdings:')
    const holdings = await groww.holdings.list()
    console.log(`✅ Holdings received: ${holdings.holdings?.length || 0} holdings`)

    // Test 5: Get positions
    console.log('\n📊 Testing positions:')
    const positions = await groww.positions.user({})
    console.log(`✅ Positions received: ${positions.positions?.length || 0} positions`)

    // Test 6: Get margin details
    console.log('\n💰 Testing margin details:')
    const margins = await groww.margins.details()
    console.log('✅ Margin details received:', JSON.stringify(margins, null, 2))

    console.log('\n🎉 All GrowwAPI tests passed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testGrowwAPI()
