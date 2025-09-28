import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Candle1m,
  Candle5m,
  Candle15m,
  Candle30m,
  Candle1h,
  Candle4h,
  Candle1d,
  BaseCandle,
  TimeframeType,
} from '../schemas/candle.schema';

export interface CandleQueryResult {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type CandleRepositoryMap = Record<TimeframeType, Repository<BaseCandle>>;

@Injectable()
export class CandleQueryService {
  private readonly logger = new Logger(CandleQueryService.name);
  private repositoryMap: CandleRepositoryMap;

  constructor(
    @InjectRepository(Candle1m) private candle1mRepo: Repository<Candle1m>,
    @InjectRepository(Candle5m) private candle5mRepo: Repository<Candle5m>,
    @InjectRepository(Candle15m) private candle15mRepo: Repository<Candle15m>,
    @InjectRepository(Candle30m) private candle30mRepo: Repository<Candle30m>,
    @InjectRepository(Candle1h) private candle1hRepo: Repository<Candle1h>,
    @InjectRepository(Candle4h) private candle4hRepo: Repository<Candle4h>,
    @InjectRepository(Candle1d) private candle1dRepo: Repository<Candle1d>,
  ) {
    this.repositoryMap = {
      '1m': this.candle1mRepo,
      '5m': this.candle5mRepo,
      '15m': this.candle15mRepo,
      '30m': this.candle30mRepo,
      '1h': this.candle1hRepo,
      '4h': this.candle4hRepo,
      '1d': this.candle1dRepo,
    } as CandleRepositoryMap;
  }

  async getRecentCandles(
    symbol: string,
    timeframe: TimeframeType,
    limit: number = 200,
  ): Promise<CandleQueryResult[]> {
    const repository = this.repositoryMap[timeframe];

    if (!repository) {
      this.logger.warn(`No repository configured for timeframe ${timeframe}`);
      return [];
    }

    const results = await repository.find({
      where: { symbol },
      order: { timestamp: 'DESC' },
      take: limit,
    });

    return results
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .map((candle) => ({
        timestamp: Number(candle.timestamp),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      }));
  }
}
