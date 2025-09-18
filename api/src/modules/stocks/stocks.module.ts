import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { IndicatorsService } from './indicators.service'
import { QUOTES_PROVIDER } from './providers'
import type { QuotesProvider } from './providers/provider.interface'
import { GrowwProvider } from './providers/groww.provider'
import { NseProvider } from './providers/nse.provider'
import { PolygonProvider } from './providers/polygon.provider'
import { GrowwAuthService } from './providers/groww-auth.service'
import { SymbolsService } from './symbols.service'
import { StockSymbol } from '../../entities/StockSymbol.entity'
import { Holding } from '../../entities/Holding.entity'
import { QuotesService } from './quotes.service'
import { StocksController } from './stocks.controller'
import { StockQuoteCacheService } from './stock-quote-cache.service'
import { BrokerModule } from '../broker/broker.module'

@Module({
  imports: [HttpModule, JwtModule.register({}), TypeOrmModule.forFeature([StockSymbol, Holding]), BrokerModule],
  providers: [
    QuotesService,
    IndicatorsService,
    GrowwAuthService,
    SymbolsService,
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
    StockQuoteCacheService,
  ],
  controllers: [StocksController],
  exports: [QuotesService, IndicatorsService, QUOTES_PROVIDER, SymbolsService, GrowwAuthService, StockQuoteCacheService],
})
export class StocksModule {} 