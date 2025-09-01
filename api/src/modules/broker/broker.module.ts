import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'

// Entities
import { StrategyOrder } from '../strategy/entities/strategy-order.entity'
import { StrategyPosition } from '../strategy/entities/strategy-position.entity'
import { StrategyExecutionLog } from '../strategy/entities/strategy-execution-log.entity'

// Services
import { GrowwApiService } from './services/groww-api.service'
import { OrderService } from './services/order.service'

// Controllers
import { BrokerController } from './controllers/broker.controller'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      StrategyOrder,
      StrategyPosition,
      StrategyExecutionLog
    ])
  ],
  controllers: [
    BrokerController
  ],
  providers: [
    GrowwApiService,
    OrderService
  ],
  exports: [
    GrowwApiService,
    OrderService,
    TypeOrmModule
  ]
})
export class BrokerModule {}
