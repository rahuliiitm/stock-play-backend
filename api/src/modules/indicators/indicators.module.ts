import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { IndicatorConfig } from './indicator-config.entity'
import { IndicatorValue } from './indicator-value.entity'
import { IndicatorProviderRegistryService } from './indicator-provider-registry.service'
import { IndicatorCalculationService } from './indicator-calculation.service'
import { IndicatorsController } from './indicators.controller'
import { StocksModule } from '../stocks/stocks.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([IndicatorConfig, IndicatorValue]),
    ScheduleModule.forRoot(),
    StocksModule,
  ],
  providers: [
    IndicatorProviderRegistryService,
    IndicatorCalculationService,
  ],
  controllers: [IndicatorsController],
  exports: [
    IndicatorProviderRegistryService,
    IndicatorCalculationService,
  ],
})
export class IndicatorsModule {}
