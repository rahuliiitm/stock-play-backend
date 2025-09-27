# StockPlay Algorithmic Trading Backend - Strategy Integration Guide

## EMA-Gap ATR Trend Strategy

The backend now has a configurable EMA-gap trend-following strategy that operates on 15-minute (configurable) NIFTY candles. It relies on the updated trading and indicator pipelines.

### Key Components

- `TradingModule`
  * `LiveDataFeedService` — polls Groww API and emits `trading.liveData` events.
  * `CandleAggregationService` — stores 1m and 15m candles (with Redis-based aggregation).
  * `CandleQueryService` — convenience service for fetching historical candles from Postgres.

- `IndicatorsModule`
  * Providers added for `EMA`, `ATR`, and `ADX` alongside existing RSI.
  * `IndicatorProviderRegistryService` exposes them for on-demand calculations or scheduled jobs.

- `StrategyModule`
  * `EmaGapAtrStrategyService` — pure calculation engine (EMA, ATR, RSI, ADX, gap, slope, pyramiding metadata).
  * `StrategySignalListenerService` — listens to `trading.strategyEvaluation`, filters enabled `EMA_GAP_ATR` strategies, runs the evaluation, and emits `strategy.signal` events.
  * `TradingStrategyRunnerService` — callable helper to run a strategy immediately (used by background jobs/tests).

### Data Flow

1. `trading.liveData` → aggregated into 15m candles and cached in Redis/Postgres.
2. `trading.candleAggregated` → `trading.indicatorUpdate` → `trading.strategyEvaluation`.
3. `StrategySignalListenerService` reacts to `trading.strategyEvaluation`, loads active strategies for the symbol, fetches candles via `CandleQueryService`, runs `EmaGapAtrStrategyService`, and emits `strategy.signal` events.
4. Downstream listeners (e.g. execution engines) can subscribe to `strategy.signal` to place trades.

### Strategy Configuration

Persisted in `Strategy.config` JSON. Example payload:

```json
{
  "strategyType": "EMA_GAP_ATR",
  "parameters": {
    "timeframe": "15m",
    "emaFastPeriod": 9,
    "emaSlowPeriod": 20,
    "atrPeriod": 14,
    "minGapThreshold": 0,
    "minGapMultiplier": 0.3,
    "slopeLookback": 3,
    "slopeMin": 0,
    "rsiPeriod": 14,
    "rsiThreshold": 50,
    "adxPeriod": 14,
    "adxThreshold": 25,
    "multiplier": 0.6,
    "maxLots": 3,
    "trailingAtrMultiplier": 1,
    "optionsEnabled": true,
    "callStrikes": "ATM,ATM+1",
    "putStrikes": "ATM,ATM-1",
    "lotSize": 50,
    "strikeIncrement": 50
  }
}
```

### Option Strike Selection

The system now supports configurable option strike selection for Indian markets:

- **Expiry**: Automatically calculates next Tuesday expiry (NIFTY standard)
- **Strike Calculation**: ATM strikes based on current LTP, rounded to nearest 50-point increment
- **Strike Types**: 
  - `ATM`: At-the-money (closest to current price)
  - `ATM+1`: One increment above ATM
  - `ATM-1`: One increment below ATM
  - `OTM`: Out-of-the-money (higher for calls, lower for puts)
  - `ITM`: In-the-money (lower for calls, higher for puts)

**Example**: If NIFTY LTP is 24,567, ATM strike = 24,550 (nearest 50-point increment)
- ATM+1 = 24,600
- ATM-1 = 24,500
- Generated symbols: `NIFTY25SEP24550CE`, `NIFTY25SEP24600CE`, etc.

### Black Box Architecture Implementation

The system now follows strict black box architecture principles for testing and backtesting:

#### Environment-Based Provider Selection
```bash
# For backtesting with CSV data
export DATA_PROVIDER_MODE=csv
export CSV_DATA_DIR=./data
export ORDER_EXECUTION_MODE=mock

# For live trading with Groww API
export DATA_PROVIDER_MODE=groww
export ORDER_EXECUTION_MODE=groww
```

#### Backtesting API
```bash
# Run backtest via REST API
POST /api/backtest/ema-gap-atr
{
  "symbol": "NIFTY",
  "timeframe": "15m",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 1000000,
  "strategyConfig": { ... }
}
```

#### Module Boundaries
- **Data Layer**: Abstract `MarketDataProvider` interface with CSV and Groww implementations
- **Execution Layer**: Abstract `OrderExecutionProvider` interface with Mock and Groww implementations
- **Strategy Layer**: Pure calculation engine with no external dependencies
- **Orchestration Layer**: Coordinates data, strategy, and execution without knowing implementations

#### Testing Benefits
- Complete isolation of strategy logic from data sources
- Ability to test with historical CSV data
- Mock order execution for safe testing
- Replaceable components without code changes
- Black box testing at interface boundaries

### Extending/Testing

- Use environment variables to switch between CSV/Groww data and Mock/Groww execution
- Place CSV files in `./data` directory with format: `SYMBOL_TIMEFRAME.csv`
- Register strategies through existing management endpoints
- Run backtests via `/api/backtest/ema-gap-atr` endpoint
- All modules can be tested in isolation with mock dependencies

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
