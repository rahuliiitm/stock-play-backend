import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { StockPriceHistory } from '../../entities/StockPriceHistory.entity';

import { PortfolioV2 } from '../../entities/PortfolioV2.entity';
import { Holding } from '../../entities/Holding.entity';
import { PortfolioSnapshotV2 } from '../../entities/PortfolioSnapshotV2.entity';
import { PortfolioJobsService } from './portfolio-jobs.service';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { StocksModule } from '../stocks/stocks.module';
import { SymbolsJobsService } from './symbols-jobs.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      StockPriceHistory,

      PortfolioV2,
      Holding,
      PortfolioSnapshotV2,
    ]),
    PortfolioModule,
    StocksModule,
  ],
  providers: [PortfolioJobsService, SymbolsJobsService],
  exports: [PortfolioJobsService, SymbolsJobsService],
})
export class TasksModule {}
