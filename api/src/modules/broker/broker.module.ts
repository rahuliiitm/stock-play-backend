import { Module } from '@nestjs/common'
import Redis from 'ioredis'
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
    OrderService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (): Redis => {
        const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
        return new Redis(url)
      },
    },
  ],
  exports: [
    GrowwApiService,
    OrderService,
    TypeOrmModule
  ]
})
export class BrokerModule {}
