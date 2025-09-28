import { Injectable, Logger } from '@nestjs/common';
import {
  MarketDataProvider,
  QuoteData,
  CandleData,
  OptionChainData,
  OptionStrikeData,
} from '../interfaces/data-provider.interface';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

interface RawCandleData {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface AggregatedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class CsvDataProvider implements MarketDataProvider {
  private readonly logger = new Logger(CsvDataProvider.name);
  private dataDirectory: string;
  private currentIndex: number = 0;
  private candleData: Map<string, CandleData[]> = new Map();

  constructor() {
    this.dataDirectory =
      process.env.CSV_DATA_DIR || path.join(process.cwd(), 'data');
    console.log('CsvDataProvider constructor called!');
    console.log(`CSV_DATA_DIR env var: ${process.env.CSV_DATA_DIR}`);
    console.log(`Data directory: ${this.dataDirectory}`);
    console.log(`Current working directory: ${process.cwd()}`);
    this.logger.log(
      `CsvDataProvider initialized with data directory: ${this.dataDirectory}`,
    );
    this.logger.log(`Current working directory: ${process.cwd()}`);
  }

  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const candles = this.candleData.get(symbol);
      if (!candles || candles.length === 0) {
        return null;
      }

      const latestCandle = candles[candles.length - 1];
      return {
        symbol,
        ltp: latestCandle.close,
        price: latestCandle.close,
        volume: latestCandle.volume,
        timestamp: latestCandle.timestamp,
        exchange: 'NSE',
        segment: 'CASH',
      };
    } catch (error) {
      this.logger.error(`Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  async getHistoricalCandles(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CandleData[]> {
    try {
      console.log('CsvDataProvider.getHistoricalCandles called!');
      console.log(`Symbol: ${symbol}, Timeframe: ${timeframe}`);
      console.log(`Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
      this.logger.log(
        `Loading historical candles for ${symbol} ${timeframe} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );
      this.logger.log(`Data directory: ${this.dataDirectory}`);
      const filePath = path.join(
        this.dataDirectory,
        `${symbol}_${timeframe}.csv`,
      );
      console.log(`File path: ${filePath}`);
      console.log(`File exists: ${fs.existsSync(filePath)}`);
      this.logger.log(`Looking for file: ${filePath}`);
      this.logger.log(`File exists: ${fs.existsSync(filePath)}`);

      if (!fs.existsSync(filePath)) {
        console.log('File not found, returning empty array');
        this.logger.warn(`Data file not found: ${filePath}`);
        return [];
      }

      const candles: CandleData[] = [];

      return new Promise((resolve, reject) => {
        this.logger.log(`Reading CSV file: ${filePath}`);
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            // Handle both string dates and numeric timestamps
            let timestamp: number;
            if (row.timestamp) {
              // If timestamp is a number (Unix timestamp in ms)
              const timestampNum = parseFloat(row.timestamp);
              if (!isNaN(timestampNum)) {
                timestamp = timestampNum;
              } else {
                // If timestamp is a date string
                timestamp = new Date(row.timestamp).getTime();
              }
            } else if (row.date) {
              timestamp = new Date(row.date).getTime();
            } else {
              return; // Skip invalid rows
            }

            const candleDate = new Date(timestamp);

            if (candleDate >= startDate && candleDate <= endDate) {
              candles.push({
                symbol,
                timestamp,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseFloat(row.volume || 0),
                timeframe,
              });
            }
          })
          .on('end', () => {
            this.candleData.set(symbol, candles);
            const sortedCandles = candles.sort(
              (a, b) => a.timestamp - b.timestamp,
            );
            this.logger.log(
              `Loaded ${sortedCandles.length} candles for ${symbol} ${timeframe}`,
            );
            this.logger.log(`Date range requested: ${startDate.toISOString()} to ${endDate.toISOString()}`);
            if (sortedCandles.length > 0) {
              this.logger.log(`First candle: ${new Date(sortedCandles[0].timestamp).toISOString()}`);
              this.logger.log(`Last candle: ${new Date(sortedCandles[sortedCandles.length - 1].timestamp).toISOString()}`);
            }
            resolve(sortedCandles);
          })
          .on('error', (error) => {
            this.logger.error(`Error reading CSV file ${filePath}:`, error);
            reject(error);
          });
      });
    } catch (error) {
      this.logger.error(
        `Failed to get historical candles for ${symbol}:`,
        error,
      );
      return [];
    }
  }

  async getOptionChain(
    symbol: string,
    expiry?: string,
  ): Promise<OptionChainData | null> {
    try {
      const filePath = path.join(
        this.dataDirectory,
        `option_chain_${symbol}.csv`,
      );

      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Option chain file not found: ${filePath}`);
        return null;
      }

      const strikes: OptionStrikeData[] = [];

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            if (!expiry || row.expiry === expiry) {
              strikes.push({
                strike: parseFloat(row.strike),
                type: row.type as 'CE' | 'PE',
                symbol: row.symbol,
                ltp: parseFloat(row.ltp || 0),
                volume: parseFloat(row.volume || 0),
                oi: parseFloat(row.oi || 0),
                bid: parseFloat(row.bid || 0),
                ask: parseFloat(row.ask || 0),
              });
            }
          })
          .on('end', () => {
            const calls = strikes.filter((s) => s.type === 'CE');
            const puts = strikes.filter((s) => s.type === 'PE');

            resolve({
              underlying: symbol,
              expiry: expiry || 'NEXT_TUESDAY',
              strikes,
              calls,
              puts,
            });
          })
          .on('error', (error) => {
            this.logger.error(
              `Error reading option chain file ${filePath}:`,
              error,
            );
            reject(error);
          });
      });
    } catch (error) {
      this.logger.error(`Failed to get option chain for ${symbol}:`, error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return fs.existsSync(this.dataDirectory);
    } catch (error) {
      this.logger.error('Failed to check data directory availability:', error);
      return false;
    }
  }

  /**
   * Load all data for a symbol from CSV files
   */
  async loadSymbolData(symbol: string, timeframes: string[]): Promise<void> {
    for (const timeframe of timeframes) {
      try {
        const filePath = path.join(
          this.dataDirectory,
          `${symbol}_${timeframe}.csv`,
        );
        if (fs.existsSync(filePath)) {
          await this.getHistoricalCandles(
            symbol,
            timeframe,
            new Date(0),
            new Date(),
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to load data for ${symbol} ${timeframe}:`,
          error,
        );
      }
    }
  }

  /**
   * Get next candle for backtesting
   */
  getNextCandle(symbol: string): CandleData | null {
    const candles = this.candleData.get(symbol);
    if (!candles || this.currentIndex >= candles.length) {
      return null;
    }

    return candles[this.currentIndex++];
  }

  /**
   * Reset to beginning for backtesting
   */
  reset(): void {
    this.currentIndex = 0;
  }

  /**
   * Set current index for backtesting
   */
  setCurrentIndex(index: number): void {
    this.currentIndex = index;
  }

  /**
   * Aggregate 1-minute data into 15-minute candles
   */
  private aggregateTo15m(rawData: RawCandleData[]): AggregatedCandle[] {
    const aggregatedCandles: AggregatedCandle[] = [];
    const groupedBy15m: { [key: number]: RawCandleData[] } = {};

    // Group 1-minute candles by 15-minute intervals
    for (const candle of rawData) {
      const timestamp = new Date(candle.date).getTime();
      // Round down to nearest 15-minute interval
      const intervalStart =
        Math.floor(timestamp / (15 * 60 * 1000)) * (15 * 60 * 1000);

      if (!groupedBy15m[intervalStart]) {
        groupedBy15m[intervalStart] = [];
      }
      groupedBy15m[intervalStart].push(candle);
    }

    // Create 15-minute candles from grouped data
    for (const [intervalStart, candles] of Object.entries(groupedBy15m)) {
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];

      let high = parseFloat(firstCandle.high);
      let low = parseFloat(firstCandle.low);
      let volume = 0;

      // Find high, low, and sum volume across all candles in the interval
      for (const candle of candles) {
        const candleHigh = parseFloat(candle.high);
        const candleLow = parseFloat(candle.low);
        const candleVolume = parseFloat(candle.volume || '0');

        if (candleHigh > high) high = candleHigh;
        if (candleLow < low) low = candleLow;
        volume += candleVolume;
      }

      aggregatedCandles.push({
        timestamp: parseInt(intervalStart),
        open: parseFloat(firstCandle.open),
        high,
        low,
        close: parseFloat(lastCandle.close),
        volume,
      });
    }

    return aggregatedCandles.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Load and prepare NIFTY data for backtesting
   */
  async prepareNIFTYData(): Promise<void> {
    try {
      this.logger.log('Preparing NIFTY data for backtesting...');

      const rawFilePath = path.join(this.dataDirectory, 'NIFTY_1m_raw.csv');
      const processedFilePath = path.join(this.dataDirectory, 'NIFTY_15m.csv');

      if (!fs.existsSync(rawFilePath)) {
        throw new Error(`Raw NIFTY data file not found: ${rawFilePath}`);
      }

      // Check if processed file already exists
      if (fs.existsSync(processedFilePath)) {
        this.logger.log(
          'Processed NIFTY 15m data already exists, skipping aggregation',
        );
        return;
      }

      const rawData: RawCandleData[] = [];

      // Read raw 1-minute data (filter to last 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(rawFilePath)
          .pipe(csv())
          .on('data', (row: RawCandleData) => {
            const candleDate = new Date(row.date);
            if (candleDate >= oneYearAgo) {
              rawData.push(row);
            }
          })
          .on('end', () => {
            this.logger.log(
              `Loaded ${rawData.length} 1-minute candles from last year`,
            );
            resolve();
          })
          .on('error', (error) => {
            this.logger.error('Error reading raw NIFTY data:', error);
            reject(error);
          });
      });

      // Aggregate to 15-minute candles
      const aggregatedCandles = this.aggregateTo15m(rawData);

      this.logger.log(
        `Aggregated into ${aggregatedCandles.length} 15-minute candles`,
      );

      // Write 15-minute data to CSV
      const csvHeaders = 'timestamp,open,high,low,close,volume\n';
      const csvData = aggregatedCandles
        .map(
          (candle) =>
            `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume}`,
        )
        .join('\n');

      fs.writeFileSync(processedFilePath, csvHeaders + csvData);

      this.logger.log(`Saved processed 15m data to ${processedFilePath}`);
    } catch (error) {
      this.logger.error('Failed to prepare NIFTY data:', error);
      throw error;
    }
  }

  /**
   * Get last 1 year of NIFTY data for backtesting
   */
  async getNIFTYLastYearData(): Promise<CandleData[]> {
    try {
      await this.prepareNIFTYData();

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      return await this.getHistoricalCandles(
        'NIFTY',
        '15m',
        oneYearAgo,
        new Date(),
      );
    } catch (error) {
      this.logger.error('Failed to get NIFTY last year data:', error);
      return [];
    }
  }
}
