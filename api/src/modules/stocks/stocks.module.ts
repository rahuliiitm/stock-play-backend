import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { QuotesService } from './quotes.service'
import { StocksController } from './stocks.controller'
import { IndicatorsService } from './indicators.service'
import { QUOTES_PROVIDER } from './providers'
import type { QuotesProvider } from './providers/provider.interface'
import { GrowwProvider } from './providers/groww.provider'
import { NseProvider } from './providers/nse.provider'
import { PolygonProvider } from './providers/polygon.provider'
import { GrowwAuthService } from './providers/groww-auth.service'

@Module({
  imports: [HttpModule],
  providers: [
    QuotesService,
    IndicatorsService,
    GrowwAuthService,
    { provide: GrowwProvider, useClass: GrowwProvider },
    { provide: NseProvider, useClass: NseProvider },
    { provide: PolygonProvider, useClass: PolygonProvider },
    {
      provide: QUOTES_PROVIDER,
      useFactory: (groww: GrowwProvider, nse: NseProvider, poly: PolygonProvider): QuotesProvider => {
        const name = (process.env.STOCK_DATA_PROVIDER || 'groww').toLowerCase()
        if (name === 'nse') return nse
        if (name === 'polygon') return poly
        return groww
      },
      inject: [GrowwProvider, NseProvider, PolygonProvider],
    },
  ],
  controllers: [StocksController],
  exports: [QuotesService, IndicatorsService, QUOTES_PROVIDER],
})
export class StocksModule {} 