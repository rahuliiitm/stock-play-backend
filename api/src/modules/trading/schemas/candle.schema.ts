import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TimeframeType = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export abstract class BaseCandle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  symbol: string;

  @Column({ type: 'bigint' })
  @Index()
  timestamp: number; // Unix timestamp in milliseconds

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  open: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  high: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  low: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  close: number;

  @Column({ type: 'bigint' })
  volume: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('candles_1m')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle1m extends BaseCandle {}

@Entity('candles_5m')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle5m extends BaseCandle {}

@Entity('candles_15m')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle15m extends BaseCandle {}

@Entity('candles_30m')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle30m extends BaseCandle {}

@Entity('candles_1h')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle1h extends BaseCandle {}

@Entity('candles_4h')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle4h extends BaseCandle {}

@Entity('candles_1d')
@Index(['symbol', 'timestamp'], { unique: true })
export class Candle1d extends BaseCandle {}

// Helper type for candle entities
export type CandleEntity = Candle1m | Candle5m | Candle15m | Candle30m | Candle1h | Candle4h | Candle1d;

// Helper function to get entity class by timeframe
export function getCandleEntity(timeframe: TimeframeType): new () => CandleEntity {
  switch (timeframe) {
    case '1m': return Candle1m;
    case '5m': return Candle5m;
    case '15m': return Candle15m;
    case '30m': return Candle30m;
    case '1h': return Candle1h;
    case '4h': return Candle4h;
    case '1d': return Candle1d;
    default: throw new Error(`Unknown timeframe: ${timeframe}`);
  }
}

// Redis key patterns for aggregation
export const REDIS_KEYS = {
  LIVE_DATA_FEED: 'trading:live:feed',
  CANDLE_AGGREGATION: (symbol: string, timeframe: TimeframeType) =>
    `trading:candle:${symbol}:${timeframe}`,
  LAST_CANDLE: (symbol: string, timeframe: TimeframeType) =>
    `trading:last_candle:${symbol}:${timeframe}`,
  SYMBOL_SUBSCRIPTIONS: 'trading:subscriptions',
} as const;
