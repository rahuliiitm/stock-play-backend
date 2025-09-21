import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'

import { PortfolioSyncSchedulerService } from './portfolio-sync-scheduler.service'
import { PortfolioSchedulerController } from './portfolio-scheduler.controller'
import { BrokerAccountsService } from './broker-accounts.service'
import { BrokerAccount } from '../../entities/BrokerAccount.entity'
import { RealHolding } from '../../entities/RealHolding.entity'
import { RealPosition } from '../../entities/RealPosition.entity'
import { OrderHistory } from '../../entities/OrderHistory.entity'
import { OrderQuantityChange } from '../../entities/OrderQuantityChange.entity'
import { PortfolioSnapshot } from '../../entities/PortfolioSnapshot.entity'
import { SyncBatch } from '../../entities/SyncBatch.entity'
import { BrokerModule } from '../broker/broker.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      BrokerAccount,
      RealHolding,
      RealPosition,
      OrderHistory,
      OrderQuantityChange,
      PortfolioSnapshot,
      SyncBatch
    ]),
    BrokerModule
  ],
  providers: [PortfolioSyncSchedulerService, BrokerAccountsService],
  controllers: [PortfolioSchedulerController],
  exports: [PortfolioSyncSchedulerService, BrokerAccountsService]
})
export class PortfolioSchedulerModule {}
