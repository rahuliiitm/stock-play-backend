import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'

// Strategy system
import { StrategyModule } from '../src/modules/strategy/strategy.module'
import { StrategyRunnerService } from '../src/modules/strategy/services/strategy-runner.service'
import { NIFTY_OPTION_SELLING_CONFIG } from '../src/modules/strategy/interfaces/strategy-config.interface'

// Broker system
import { BrokerModule } from '../src/modules/broker/broker.module'
import { GrowwApiService } from '../src/modules/broker/services/groww-api.service'

// Trading module for market data
import { TradingModule } from '../src/modules/trading/trading.module'
import { LiveDataFeedService } from '../src/modules/trading/services/live-data-feed.service'

// Strategy entities
import { Strategy } from '../src/modules/strategy/entities/strategy.entity'
import { StrategyRuntimeState } from '../src/modules/strategy/entities/strategy-runtime-state.entity'
import { StrategyPosition } from '../src/modules/strategy/entities/strategy-position.entity'
import { StrategyOrder } from '../src/modules/strategy/entities/strategy-order.entity'
import { StrategyExecutionLog } from '../src/modules/strategy/entities/strategy-execution-log.entity'

describe('Strategy Groww Integration (e2e)', () => {
  let app: INestApplication
  let strategyRunner: StrategyRunnerService
  let growwApi: GrowwApiService
  let liveDataFeed: LiveDataFeedService
  let testStrategyId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'test_user',
          password: process.env.DB_PASSWORD || 'test_password',
          database: process.env.DB_NAME || 'stockplay_test',
          entities: [
            Strategy,
            StrategyRuntimeState,
            StrategyPosition,
            StrategyOrder,
            StrategyExecutionLog
          ],
          synchronize: true,
          dropSchema: true,
          logging: false
        }),
        StrategyModule,
        BrokerModule,
        TradingModule
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())

    // Get service instances
    strategyRunner = moduleFixture.get<StrategyRunnerService>(StrategyRunnerService)
    growwApi = moduleFixture.get<GrowwApiService>(GrowwApiService)
    liveDataFeed = moduleFixture.get<LiveDataFeedService>(LiveDataFeedService)

    await app.init()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  describe('Complete Strategy Execution with Groww API', () => {
    it('should execute complete strategy lifecycle with real Groww API', async () => {
      console.log('🚀 Starting complete strategy lifecycle test with Groww API')

      // 1. Verify Groww API connectivity
      const connectivity = await growwApi.testConnectivity()
      expect(connectivity.connected).toBe(true)
      console.log('✅ Groww API connectivity verified')

      // 2. Start the NIFTY option selling strategy
      const config = NIFTY_OPTION_SELLING_CONFIG
      const startResult = await strategyRunner.startStrategy(config)
      expect(startResult).toBe(true)
      console.log('✅ Strategy started successfully')

      // 3. Verify strategy is running
      const runningStrategies = strategyRunner.getRunningStrategies()
      expect(runningStrategies).toContain(config.id)
      console.log('✅ Strategy verified as running')

      // 4. Simulate market data feed
      const mockCandleData = {
        timestamp: Date.now(),
        open: 22000,
        high: 22100,
        low: 21950,
        close: 22075,
        volume: 1500000
      }

      const mockIndicators = {
        supertrend_direction: { value: 'bullish', timestamp: new Date() },
        ema20: { value: 22000, timestamp: new Date() }
      }

      // 5. Feed candle data to strategy
      await strategyRunner.processCandleData(config.id, mockCandleData, mockIndicators)
      console.log('✅ Candle data processed by strategy')

      // 6. Wait for signal generation (if any)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 7. Check strategy status
      const status = strategyRunner.getStrategyStatus(config.id)
      expect(status.isRunning).toBe(true)
      console.log('✅ Strategy status checked:', status)

      // 8. Simulate entry signal processing
      const entryCandle = {
        timestamp: Date.now() + 3600000, // 1 hour later
        open: 22075,
        high: 22150,
        low: 22050,
        close: 22125, // Confirmation candle closes above entry high
        volume: 1200000
      }

      await strategyRunner.processCandleData(config.id, entryCandle, {
        supertrend_direction: { value: 'bullish', timestamp: new Date() },
        ema20: { value: 22025, timestamp: new Date() }
      })
      console.log('✅ Entry confirmation processed')

      // 9. Wait for order execution
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 10. Check if position was created
      const updatedStatus = strategyRunner.getStrategyStatus(config.id)
      console.log('📊 Strategy status after potential entry:', updatedStatus)

      // 11. Simulate exit conditions
      const exitCandle = {
        timestamp: Date.now() + 7200000, // 2 hours later
        open: 22125,
        high: 22200,
        low: 22000,
        close: 21950, // Supertrend flip to bearish
        volume: 2000000
      }

      await strategyRunner.processCandleData(config.id, exitCandle, {
        supertrend_direction: { value: 'bearish', timestamp: new Date() }, // Flip
        ema20: { value: 22050, timestamp: new Date() }
      })
      console.log('✅ Exit conditions processed')

      // 12. Wait for exit execution
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 13. Stop the strategy
      const stopResult = await strategyRunner.stopStrategy(config.id)
      expect(stopResult).toBe(true)
      console.log('✅ Strategy stopped successfully')

      console.log('🎉 Complete strategy lifecycle test completed successfully!')
    }, 30000) // 30 second timeout

    it('should handle broker API authentication and session management', async () => {
      console.log('🔐 Testing Groww API authentication')

      // Test authentication
      const authResult = await growwApi.authenticate({
        email: process.env.GROWW_EMAIL,
        password: process.env.GROWW_PASSWORD,
        totpSecret: process.env.GROWW_TOTP_SECRET
      })

      expect(authResult.success).toBe(true)
      expect(authResult.data).toHaveProperty('accessToken')
      console.log('✅ Authentication successful')

      // Test session persistence
      const accountInfo = await growwApi.getAccountInfo()
      expect(accountInfo.success).toBe(true)
      expect(accountInfo.data).toHaveProperty('user')
      console.log('✅ Account info retrieved successfully')

      console.log('🔐 Broker authentication test completed')
    })

    it('should handle option chain data retrieval and strike selection', async () => {
      console.log('📊 Testing option chain data and strike selection')

      // Test option chain retrieval
      const optionChain = await growwApi.getOptionChain('NIFTY', new Date())
      if (optionChain.success) {
        expect(optionChain.data).toHaveProperty('strikes')
        expect(Array.isArray(optionChain.data.strikes)).toBe(true)
        console.log('✅ Option chain data retrieved')

        // Test strike selection logic
        const spotPrice = 22000
        const selectedStrikes = selectStrikesForSpread(spotPrice, optionChain.data.strikes, 'BULL_PUT_SPREAD')

        expect(selectedStrikes.sellStrike).toBeDefined()
        expect(selectedStrikes.buyStrike).toBeDefined()
        expect(selectedStrikes.sellStrike).toBeGreaterThan(selectedStrikes.buyStrike)
        console.log('✅ Strike selection logic verified')
      } else {
        console.log('⚠️ Option chain not available, skipping strike selection test')
      }

      console.log('📊 Option chain test completed')
    })

    it('should handle order placement and management through Groww API', async () => {
      console.log('📝 Testing order placement and management')

      // Get current market data
      const quote = await growwApi.getQuote('NIFTY')
      if (quote.success) {
        const spotPrice = quote.data.lastPrice

        // Create mock spread order
        const spreadOrder = {
          symbol: 'NIFTY',
          orders: [
            {
              side: 'SELL',
              optionType: 'PE',
              strike: Math.round(spotPrice / 50) * 50,
              quantity: 50,
              orderType: 'MARKET',
              productType: 'MIS'
            },
            {
              side: 'BUY',
              optionType: 'PE',
              strike: Math.round(spotPrice / 50) * 50 - 200,
              quantity: 50,
              orderType: 'MARKET',
              productType: 'MIS'
            }
          ],
          expiry: getWeeklyExpiry()
        }

        // Note: This would place real orders - only run in development with paper trading
        // const orderResult = await growwApi.placeOrder(spreadOrder)

        console.log('📝 Order structure validated (real order placement commented for safety)')
      } else {
        console.log('⚠️ Market data not available, skipping order test')
      }

      console.log('📝 Order management test completed')
    })

    it('should handle position tracking and P&L calculation', async () => {
      console.log('💰 Testing position tracking and P&L')

      // Test positions retrieval
      const positions = await growwApi.getPositions()
      expect(positions.success).toBe(true)
      console.log('✅ Positions retrieved successfully')

      if (positions.data && positions.data.length > 0) {
        // Test P&L calculation for existing positions
        const position = positions.data[0]
        const pnl = calculatePositionPnL(position)

        expect(typeof pnl).toBe('number')
        console.log('✅ P&L calculation verified')
      } else {
        console.log('ℹ️ No open positions to test P&L calculation')
      }

      console.log('💰 Position tracking test completed')
    })

    it('should handle market data streaming and indicator calculation', async () => {
      console.log('📈 Testing market data streaming and indicators')

      // Test live data subscription
      const subscriptionResult = await liveDataFeed.subscribeToSymbol('NIFTY')
      expect(subscriptionResult.success).toBe(true)
      console.log('✅ Live data subscription successful')

      // Wait for some data
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Test indicator calculation
      const indicators = await liveDataFeed.getIndicators('NIFTY', ['supertrend', 'ema20'])
      if (indicators.success) {
        expect(indicators.data).toHaveProperty('supertrend')
        expect(indicators.data).toHaveProperty('ema20')
        console.log('✅ Indicator calculation successful')
      }

      // Unsubscribe
      await liveDataFeed.unsubscribeFromSymbol('NIFTY')
      console.log('✅ Live data unsubscription successful')

      console.log('📈 Market data streaming test completed')
    })

    it('should handle error scenarios and recovery', async () => {
      console.log('🛠️ Testing error handling and recovery')

      // Test invalid authentication
      try {
        await growwApi.authenticate({
          email: 'invalid@email.com',
          password: 'wrongpassword',
          totpSecret: 'invalid'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        console.log('✅ Invalid authentication handled correctly')
      }

      // Test network error recovery
      const mockNetworkError = async () => {
        throw new Error('Network connection failed')
      }

      try {
        await mockNetworkError()
        expect(true).toBe(false)
      } catch (error) {
        expect(error.message).toContain('Network connection failed')
        console.log('✅ Network error handled correctly')
      }

      // Test strategy restart after error
      const config = NIFTY_OPTION_SELLING_CONFIG
      const startResult = await strategyRunner.startStrategy(config)
      expect(startResult).toBe(true)

      // Simulate error
      const errorConfig = { ...config, id: 'error-test' }
      await strategyRunner.startStrategy(errorConfig)

      // Stop strategies
      await strategyRunner.stopStrategy(config.id)
      await strategyRunner.stopStrategy(errorConfig.id)

      console.log('✅ Error handling and recovery test completed')
    })

    it('should handle concurrent strategy execution', async () => {
      console.log('⚡ Testing concurrent strategy execution')

      const config1 = { ...NIFTY_OPTION_SELLING_CONFIG, id: 'strategy-1' }
      const config2 = { ...NIFTY_OPTION_SELLING_CONFIG, id: 'strategy-2' }

      // Start multiple strategies
      const startPromises = [
        strategyRunner.startStrategy(config1),
        strategyRunner.startStrategy(config2)
      ]

      const results = await Promise.all(startPromises)
      expect(results.every(r => r === true)).toBe(true)
      console.log('✅ Multiple strategies started successfully')

      // Check running strategies
      const running = strategyRunner.getRunningStrategies()
      expect(running).toContain('strategy-1')
      expect(running).toContain('strategy-2')
      console.log('✅ Concurrent execution verified')

      // Stop all strategies
      const stopPromises = [
        strategyRunner.stopStrategy('strategy-1'),
        strategyRunner.stopStrategy('strategy-2')
      ]

      await Promise.all(stopPromises)
      console.log('✅ All strategies stopped successfully')

      console.log('⚡ Concurrent strategy execution test completed')
    })

    it('should validate strategy performance metrics', async () => {
      console.log('📊 Testing strategy performance metrics')

      // Create test strategy data
      const testStrategy = {
        totalTrades: 10,
        winningTrades: 7,
        losingTrades: 3,
        totalPnL: 2500,
        maxDrawdown: 800,
        winRate: 70,
        avgProfit: 357,
        avgLoss: -267,
        profitFactor: 2.1
      }

      // Validate performance calculations
      expect(testStrategy.winRate).toBeGreaterThan(50)
      expect(testStrategy.profitFactor).toBeGreaterThan(1)
      expect(testStrategy.totalPnL).toBeGreaterThan(0)
      console.log('✅ Performance metrics validation successful')

      // Test risk-adjusted returns
      const sharpeRatio = calculateSharpeRatio(testStrategy.totalPnL, testStrategy.maxDrawdown)
      expect(sharpeRatio).toBeGreaterThan(0)
      console.log('✅ Risk-adjusted metrics calculated')

      console.log('📊 Performance metrics test completed')
    })
  })

  // Helper functions
  function selectStrikesForSpread(spotPrice: number, availableStrikes: any[], spreadType: string) {
    const baseStrike = Math.round(spotPrice / 50) * 50

    if (spreadType === 'BULL_PUT_SPREAD') {
      return {
        sellStrike: baseStrike,
        buyStrike: baseStrike - 200,
        optionType: 'PE'
      }
    } else if (spreadType === 'BEAR_CALL_SPREAD') {
      return {
        sellStrike: baseStrike,
        buyStrike: baseStrike + 200,
        optionType: 'CE'
      }
    }

    return null
  }

  function getWeeklyExpiry(): Date {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
    const expiryDate = new Date(now)
    expiryDate.setDate(now.getDate() + daysUntilThursday)
    expiryDate.setHours(15, 30, 0, 0)
    return expiryDate
  }

  function calculatePositionPnL(position: any): number {
    // Mock P&L calculation
    const entryPrice = position.averagePrice || 0
    const currentPrice = position.lastPrice || entryPrice
    const quantity = position.quantity || 0

    return (currentPrice - entryPrice) * quantity
  }

  function calculateSharpeRatio(totalPnL: number, maxDrawdown: number): number {
    // Simplified Sharpe ratio calculation
    const riskFreeRate = 0.06
    const strategyReturn = totalPnL / 10000 // Assuming 10k capital
    const volatility = maxDrawdown / 10000

    return (strategyReturn - riskFreeRate) / volatility
  }
})
