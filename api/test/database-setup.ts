import { DataSource } from 'typeorm'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '../.env.development') })

export class TestDatabaseSetup {
  private static dataSource: DataSource

  static async createTestDatabase(): Promise<DataSource> {
    // Create a test database connection
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'rjain',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stockplay',
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      synchronize: false, // Don't auto-sync to avoid foreign key issues
      logging: false,
    })

    await this.dataSource.initialize()
    
    // Clean up existing data before tests
    await this.cleanupTestDatabase()
    
    console.log('✅ Test database connected and cleaned')
    return this.dataSource
  }

  static async cleanupTestDatabase(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      // Clean up all test data in reverse dependency order
      const entities = this.dataSource.entityMetadatas
      
      // Define cleanup order to avoid foreign key constraints
      const cleanupOrder = [
        'IndicatorValue',
        'IndicatorConfig', 
        'LeaderboardEntry',
        'PortfolioSnapshotV2',
        'PortfolioTransactionV2',
        'Holding',
        'Position',
        'PortfolioComment',
        'PortfolioLike',
        'PortfolioSubscription',
        'PortfolioPerformance',
        'PositionPerformance',
        'MarketMovers',
        'PortfolioV2',
        'BrokerToken',
        'BrokerAccount',
        'User',
        'StockPriceHistory',
        'StockSymbol'
      ]
      
      for (const entityName of cleanupOrder) {
        const entity = entities.find(e => e.name === entityName)
        if (entity) {
          try {
            const repository = this.dataSource.getRepository(entity.name)
            await repository.clear()
            console.log(`🧹 Cleared ${entityName}`)
          } catch (error) {
            console.log(`⚠️ Could not clear ${entityName}:`, error.message)
          }
        }
      }
      
      console.log('🧹 Test database cleaned up')
    }
  }

  static async closeTestDatabase(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy()
      console.log('🔌 Test database connection closed')
    }
  }

  static async resetTestDatabase(): Promise<void> {
    await this.cleanupTestDatabase()
    console.log('🔄 Test database reset complete')
  }
}
