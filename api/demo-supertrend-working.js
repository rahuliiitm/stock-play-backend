const axios = require('axios')
require('dotenv').config({ path: '.env.development' })

async function demoSupertrendIntegration() {
  console.log('🚀 Supertrend Integration Demo')
  console.log('===============================')

  const baseUrl = 'http://localhost:3000'

  try {
    console.log('\n📊 1. Checking Available Indicators')
    const availableResponse = await axios.get(`${baseUrl}/indicators/available`)
    console.log('✅ Available indicators:', availableResponse.data.map(ind => ind.name))

    const hasSupertrend = availableResponse.data.some(ind => ind.name === 'SUPERTREND')
    console.log('✅ Supertrend available:', hasSupertrend)

    if (!hasSupertrend) {
      console.log('❌ Supertrend indicator not found!')
      return
    }

    console.log('\n📈 2. Calculating Supertrend for RELIANCE')
    const symbol = 'RELIANCE'

    const supertrendResponse = await axios.post(`${baseUrl}/indicators/supertrend/${symbol}`, {
      period: 10,
      multiplier: 3
    })

    console.log('✅ Supertrend calculation successful!')
    console.log(`   Symbol: ${supertrendResponse.data.symbol}`)
    console.log(`   Indicator: ${supertrendResponse.data.indicator_name}`)
    console.log(`   Value: ₹${supertrendResponse.data.value}`)
    console.log(`   Timestamp: ${supertrendResponse.data.calculated_at}`)
    console.log(`   Interval: ${supertrendResponse.data.interval}`)

    if (supertrendResponse.data.additional_data) {
      const data = supertrendResponse.data.additional_data
      console.log(`   Trend Direction: ${data.trendDirection}`)
      console.log(`   Signal Strength: ${data.signalStrength}%`)
      console.log(`   Signal: ${data.signal}`)
      console.log(`   Current Price: ₹${data.currentPrice}`)
    }

    console.log('\n⚙️ 3. Configuring Supertrend for Automated Calculations')
    const configResponse = await axios.post(`${baseUrl}/indicators/configs/${symbol}`, {
      indicatorName: 'SUPERTREND',
      parameters: {
        period: 10,
        multiplier: 3
      },
      description: 'Supertrend indicator for trend following on RELIANCE'
    })

    console.log('✅ Supertrend configuration created:')
    console.log(`   Config ID: ${configResponse.data.id}`)
    console.log(`   Symbol: ${configResponse.data.symbol}`)
    console.log(`   Active: ${configResponse.data.is_active}`)

    console.log('\n🔄 4. Triggering All Indicator Calculations')
    const calculateResponse = await axios.post(`${baseUrl}/indicators/calculate/${symbol}`)
    console.log(`✅ Calculated ${calculateResponse.data.length} indicators for ${symbol}`)

    const supertrendResult = calculateResponse.data.find(ind => ind.indicator_name === 'SUPERTREND')
    if (supertrendResult) {
      console.log('✅ Supertrend result:')
      console.log(`   Value: ₹${supertrendResult.value}`)
      if (supertrendResult.additional_data) {
        console.log(`   Trend: ${supertrendResult.additional_data.trendDirection}`)
        console.log(`   Signal: ${supertrendResult.additional_data.signal}`)
      }
    }

    console.log('\n📊 5. Getting Latest Indicator Values')
    const valuesResponse = await axios.get(`${baseUrl}/indicators/values/${symbol}`)
    console.log(`✅ Latest indicator values for ${symbol}:`)
    valuesResponse.data.forEach(value => {
      console.log(`   - ${value.indicator_name}: ₹${value.value} (${value.interval})`)
      if (value.indicator_name === 'SUPERTREND' && value.additional_data) {
        console.log(`     📈 Trend: ${value.additional_data.trendDirection}`)
        console.log(`     🎯 Signal: ${value.additional_data.signal}`)
        console.log(`     📊 Strength: ${value.additional_data.signalStrength}%`)
      }
    })

    console.log('\n🎉 Supertrend Integration Demo Completed Successfully!')
    console.log('\n📈 Supertrend Indicator Features:')
    console.log('   ✅ Real-time trend detection')
    console.log('   ✅ Buy/Sell signal generation')
    console.log('   ✅ Configurable parameters (period, multiplier)')
    console.log('   ✅ Multi-timeframe support')
    console.log('   ✅ Automated calculation integration')
    console.log('   ✅ Historical data processing')
    console.log('   ✅ Signal strength analysis')

  } catch (error) {
    console.error('❌ Error in Supertrend demo:', error.response?.data || error.message)
    console.log('\n🔍 Troubleshooting:')
    console.log('   - Make sure the API server is running: npm run start:dev')
    console.log('   - Check that Redis and PostgreSQL are running')
    console.log('   - Verify Groww API credentials are configured')
    console.log('   - Ensure sufficient historical data is available')
  }
}

// Run the demo
demoSupertrendIntegration().catch(console.error)
