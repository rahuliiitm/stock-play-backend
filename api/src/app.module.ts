import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StocksModule } from './modules/stocks/stocks.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { UsersModule } from './modules/users/users.module';
import { TradingModule } from './modules/trading/trading.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { BacktestModule } from './modules/backtest/backtest.module';
import { BrokerModule } from './modules/broker/broker.module';
import { PortfolioSchedulerModule } from './modules/portfolio-scheduler/portfolio-scheduler.module';
import { HealthModule } from './health/health.module';
// MarketDataModule will be added later
// import { MarketDataModule } from './modules/market-data/market-data.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'rjain',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stockplay',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Disable sync to avoid foreign key issues with existing data
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    StocksModule,
    PortfolioModule,
    TasksModule,
    IndicatorsModule,
    UsersModule,
    TradingModule,
    StrategyModule,
    BacktestModule,
    BrokerModule,
    PortfolioSchedulerModule,
    HealthModule,
    // MarketDataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
