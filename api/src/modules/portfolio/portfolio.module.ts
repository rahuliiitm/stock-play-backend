import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity'
import { PortfolioServiceV2 } from './portfolio-v2.service'
import { HoldingsService } from './holdings.service'
import { TransactionsService } from './transactions.service'
import { ValuationService } from './valuation.service'
import { PortfolioJobsService } from './portfolio-jobs.service'
import { SearchService } from './search.service'
import { BrokerService } from './broker.service'
import { PortfolioV2Controller } from './portfolio-v2.controller'
import { PublicController } from './public.controller'
import { BrokerController } from './broker.controller'
import { StocksModule } from '../stocks/stocks.module'
import { GrowwAuthService } from '../stocks/providers/groww-auth.service'
import { JwtModule } from '@nestjs/jwt'
import { PortfolioV2 } from '../../entities/PortfolioV2.entity'
import { Holding } from '../../entities/Holding.entity'
import { PortfolioTransactionV2 } from '../../entities/PortfolioTransactionV2.entity'
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity'
import { BrokerAccount } from '../../entities/BrokerAccount.entity'
import { BrokerToken } from '../../entities/BrokerToken.entity'
import { User } from '../../entities/User.entity'
import { PortfolioEventsService } from './events/portfolio-events.service'
import { PortfolioValueUpdateService } from './portfolio-value-update.service'
import { StockQuoteCacheService } from '../stocks/stock-quote-cache.service'
import { StrategyModule } from '../strategy/strategy.module'
import { Strategy } from '../strategy/entities/strategy.entity'
import { BrokerModule } from '../broker/broker.module'

@Module({
  imports: [
    HttpModule,
    JwtModule.register({}),
    EventEmitterModule.forRoot(),
    StocksModule,
    StrategyModule,
    BrokerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      StockPriceHistory,
      PortfolioV2,
      Holding,
      PortfolioTransactionV2,
      PortfolioSnapshotV2,
      BrokerAccount,
      BrokerToken,
      User,
      Strategy,
    ]),
  ],
  providers: [
    PortfolioServiceV2,
    HoldingsService,
    TransactionsService,
    ValuationService,
    PortfolioJobsService,
    SearchService,
    BrokerService,
    GrowwAuthService,
    PortfolioEventsService,
    PortfolioValueUpdateService,
    StockQuoteCacheService,
  ],
  controllers: [PortfolioV2Controller, PublicController, BrokerController],
  exports: [
    PortfolioServiceV2,
    HoldingsService,
    TransactionsService,
    ValuationService,
    PortfolioJobsService,
    SearchService,
    BrokerService,
    PortfolioEventsService,
    PortfolioValueUpdateService,
    StockQuoteCacheService,
  ],
})
export class PortfolioModule {}
