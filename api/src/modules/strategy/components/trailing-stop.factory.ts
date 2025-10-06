import { Injectable } from '@nestjs/common';
import { ITrailingStopComponent, TrailingStopConfig } from './trailing-stop.interface';
import { ATRTrailingStopComponent } from './atr-trailing-stop.component';
import { PercentageTrailingStopComponent } from './percentage-trailing-stop.component';

@Injectable()
export class TrailingStopFactory {
  constructor(
    private readonly atrTrailingStop: ATRTrailingStopComponent,
    private readonly percentageTrailingStop: PercentageTrailingStopComponent
  ) {}

  /**
   * Create a trailing stop component based on configuration
   * @param config - Trailing stop configuration
   * @returns Appropriate trailing stop component
   */
  createTrailingStopComponent(config: TrailingStopConfig): ITrailingStopComponent {
    if (!config.enabled) {
      return this.createNoOpTrailingStop();
    }

    switch (config.type) {
      case 'ATR':
        return this.atrTrailingStop;
      case 'PERCENTAGE':
        return this.percentageTrailingStop;
      default:
        throw new Error(`Unsupported trailing stop type: ${config.type}`);
    }
  }

  /**
   * Create a no-op trailing stop component for disabled trailing stops
   * @returns No-op trailing stop component
   */
  private createNoOpTrailingStop(): ITrailingStopComponent {
    return {
      checkTrailingStops: () => [],
      updateTrailingStops: (trades) => trades
    };
  }
}


