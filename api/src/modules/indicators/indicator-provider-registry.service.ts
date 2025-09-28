import { Injectable } from '@nestjs/common';
import {
  IndicatorProvider,
  IndicatorProviderRegistry,
} from './indicator-provider.interface';
import { RsiProvider } from './providers/rsi.provider';
import { SmaProvider } from './providers/sma.provider';
import { MacdProvider } from './providers/macd.provider';
import { BollingerBandsProvider } from './providers/bollinger-bands.provider';
import { SupertrendProvider } from './providers/supertrend.provider';
import { EmaProvider } from './providers/ema.provider';
import { AtrProvider } from './providers/atr.provider';
import { AdxProvider } from './providers/adx.provider';

@Injectable()
export class IndicatorProviderRegistryService
  implements IndicatorProviderRegistry
{
  private providers = new Map<string, IndicatorProvider>();

  constructor() {
    // Register default providers
    this.register(new RsiProvider());
    this.register(new SmaProvider());
    this.register(new MacdProvider());
    this.register(new BollingerBandsProvider());
    this.register(new SupertrendProvider());
    this.register(new EmaProvider());
    this.register(new AtrProvider());
    this.register(new AdxProvider());
  }

  register(provider: IndicatorProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): IndicatorProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): IndicatorProvider[] {
    return Array.from(this.providers.values());
  }

  getNames(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderInfo(name: string) {
    const provider = this.get(name);
    if (!provider) {
      return null;
    }

    return {
      name: provider.name,
      description: provider.description,
      requiredParameters: provider.requiredParameters,
      optionalParameters: provider.optionalParameters,
      minDataPoints: provider.minDataPoints,
    };
  }

  getAllProviderInfo() {
    return this.getAll().map((provider) => ({
      name: provider.name,
      description: provider.description,
      requiredParameters: provider.requiredParameters,
      optionalParameters: provider.optionalParameters,
      minDataPoints: provider.minDataPoints,
    }));
  }
}
