import {
  IndicatorProvider,
  IndicatorResult,
} from '../indicator-provider.interface';
import { Candle } from '../../../lib/market-data-sdk/models';

interface PivotLevel {
  price: number;
  index: number;
}

interface SupportResistanceParameters {
  lookbackPeriod?: number;
  pivotStrength?: number;
  maxLevels?: number;
  tolerance?: number;
}

export class SupportResistanceProvider implements IndicatorProvider {
  name = 'SUPPORT_RESISTANCE';
  description = 'Detects swing-based support and resistance zones using configurable pivots and clustering.';
  requiredParameters: string[] = [];
  optionalParameters = ['lookbackPeriod', 'pivotStrength', 'maxLevels', 'tolerance'];
  minDataPoints = 30;

  calculate(candles: Candle[], parameters: Record<string, any>): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null;
    }

    const { lookbackPeriod = 250, pivotStrength = 3, maxLevels = 5, tolerance = 0.0025 } =
      parameters as SupportResistanceParameters;

    if (candles.length < pivotStrength * 2 + 1) {
      return null;
    }

    const endIndex = candles.length;
    const startIndex = Math.max(0, endIndex - lookbackPeriod);
    const window = candles.slice(startIndex, endIndex);

    const highs = window.map((c) => c.high);
    const lows = window.map((c) => c.low);
    const close = window[window.length - 1].close;
    const timestamp = window[window.length - 1].time;

    const pivotHighs = this.findPivotLevels(highs, pivotStrength);
    const pivotLows = this.findPivotLevels(lows, pivotStrength);

    const clusteredHighs = this.clusterLevels(pivotHighs, tolerance);
    const clusteredLows = this.clusterLevels(pivotLows, tolerance);

    const supports = clusteredLows
      .map((level) => level.price)
      .sort((a, b) => b - a) // descending
      .slice(0, maxLevels);

    const resistances = clusteredHighs
      .map((level) => level.price)
      .sort((a, b) => a - b) // ascending
      .slice(0, maxLevels);

    const nearestSupport = supports.filter((price) => price <= close).shift() ?? null;
    const nearestResistance = resistances.filter((price) => price >= close).shift() ?? null;

    const representativeValue = nearestSupport ?? nearestResistance ?? close;

    return {
      value: representativeValue,
      additionalData: {
        lookbackPeriod,
        pivotStrength,
        maxLevels,
        tolerance,
        supports,
        resistances,
        nearestSupport,
        nearestResistance,
        close,
        sourceWindow: {
          start: window[0]?.time,
          end: timestamp,
          size: window.length,
        },
      },
      timestamp: new Date(timestamp),
    };
  }

  private findPivotLevels(series: number[], strength: number): PivotLevel[] {
    const pivots: PivotLevel[] = [];
    for (let i = strength; i < series.length - strength; i++) {
      const value = series[i];
      let isPivotHigh = true;
      let isPivotLow = true;

      for (let j = 1; j <= strength; j++) {
        if (value <= series[i - j] || value <= series[i + j]) {
          isPivotHigh = false;
        }
        if (value >= series[i - j] || value >= series[i + j]) {
          isPivotLow = false;
        }
        if (!isPivotHigh && !isPivotLow) {
          break;
        }
      }

      if (isPivotHigh || isPivotLow) {
        pivots.push({ price: value, index: i });
      }
    }
    return pivots;
  }

  private clusterLevels(levels: PivotLevel[], tolerance: number): PivotLevel[] {
    if (levels.length === 0) {
      return [];
    }

    const clusters: PivotLevel[] = [];

    for (const level of levels) {
      const existing = clusters.find((cluster) => Math.abs(cluster.price - level.price) / cluster.price <= tolerance);
      if (existing) {
        existing.price = (existing.price + level.price) / 2;
        existing.index = Math.max(existing.index, level.index);
      } else {
        clusters.push({ ...level });
      }
    }

    return clusters;
  }
}

