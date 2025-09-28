import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { IndicatorsService } from './indicators.service';
import { SymbolsService } from './symbols.service';
import { StockSymbol } from '../../entities/StockSymbol.entity';
import { Holding } from '../../entities/Holding.entity';
import { QuotesService } from './quotes.service';
import { StocksController } from './stocks.controller';
import { StockQuoteCacheService } from './stock-quote-cache.service';
import { StockUniverseService } from './stock-universe.service';
import { StockUniverseSchedulerService } from './stock-universe-scheduler.service';
import { StockUniverseController } from './stock-universe.controller';
import { BrokerModule } from '../broker/broker.module';

@Module({
  imports: [
    HttpModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([StockSymbol, Holding]),
    BrokerModule,
  ],
  providers: [
    QuotesService,
    IndicatorsService,
    SymbolsService,
    StockUniverseService,
    StockUniverseSchedulerService,
    StockQuoteCacheService,
  ],
  controllers: [StocksController, StockUniverseController],
  exports: [
    QuotesService,
    IndicatorsService,
    SymbolsService,
    StockQuoteCacheService,
    StockUniverseService,
  ],
})
export class StocksModule {}
