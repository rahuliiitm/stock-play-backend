import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { StocksModule } from './modules/stocks/stocks.module'
import { PortfolioModule } from './modules/portfolio/portfolio.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module'
import { EngagementModule } from './modules/engagement/engagement.module'
import { IndicatorsModule } from './modules/indicators/indicators.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'stockplay',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    StocksModule,
    PortfolioModule,
    TasksModule,
    LeaderboardModule,
    EngagementModule,
    IndicatorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
