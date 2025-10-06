import { Module } from '@nestjs/common';
import { ATRTrailingStopComponent } from './atr-trailing-stop.component';
import { PercentageTrailingStopComponent } from './percentage-trailing-stop.component';
import { TrailingStopFactory } from './trailing-stop.factory';
import { TrailingStopService } from './trailing-stop.service';

@Module({
  providers: [
    ATRTrailingStopComponent,
    PercentageTrailingStopComponent,
    TrailingStopFactory,
    TrailingStopService,
  ],
  exports: [
    ATRTrailingStopComponent,
    PercentageTrailingStopComponent,
    TrailingStopFactory,
    TrailingStopService,
  ],
})
export class StrategyComponentsModule {}


