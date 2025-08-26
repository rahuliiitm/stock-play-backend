# StockPlay Backend Technical Specification (v1.0)

## 1. Overview
StockPlay is a portfolio management and tracking platform. Users can create and manage stock portfolios (manual or connected to broker APIs like Groww), track returns, and participate in a global leaderboard. This specification defines backend architecture, data model, APIs, integrations, and non-functional requirements to implement the platform using NestJS, PostgreSQL, and Redis.

- Primary stack: NestJS (TypeScript), PostgreSQL (RDS-ready), Redis (ElastiCache-ready)
- ORM: TypeORM
- Queue/Background jobs: BullMQ (Redis)
- Caching: Redis (quotes cache, leaderboards, user sessions/rate limits)
- Auth: JWT (access + refresh), Argon2 password hashing
- Observability: pino/winston logging, OpenTelemetry tracing compatible
- Deployment: Docker + docker-compose for local; CI/CD pipelines; containerized services
- Default currency: INR; support for rupee-based portfolio values

## 2. Functional Requirements
- Authentication: email/password auth with JWT access + refresh tokens; roles: user, admin
- User Profile: display name, avatar, basic settings
- Portfolio Management: create, update, delete portfolios; add/remove stocks; track holdings and transactions
- Broker Integration: connect to Groww API for automatic portfolio sync; TOTP-based authentication
- Portfolio Tracking: real-time valuation, PnL calculation, return percentage tracking
- Leaderboard: global ranking of portfolios by return percentage; public portfolio viewing
- Stock Data: search symbols, get live quote, get historical candles; cache quotes via market-data-sdk
- Market Data SDK: reusable library for fetching, parsing, and normalizing market data from multiple sources
- Payments: Stripe/Razorpay for premium subscriptions (future)
- Notifications: transactional email for portfolio updates, performance alerts
- Admin: user suspension, portfolio moderation, system flags

## 3. Non-Functional Requirements
- Performance: p95 < 200ms for cached reads; p95 < 400ms for write operations
- Availability: target 99.9% uptime
- Scalability: horizontal scaling via stateless NestJS pods; Redis/Postgres managed services
- Security: OWASP ASVS-aligned; TLS everywhere; at-rest encryption for DB backups; secrets in vault
- Compliance: GDPR-ready deletion, audit logging for critical actions; India-compliant payment flows and data residency where applicable
- Observability: structured logs, metrics (API latency, error rates), traces; audit logs for portfolio changes

## 4. System Architecture
- API Gateway: Next.js (UI) calls NestJS REST API
- Services (NestJS modules):
  - `AuthModule`: local strategy, JWT issuance/refresh, password reset
  - `UsersModule`: profiles, admin controls
  - `PortfolioModule`: portfolio CRUD, holdings management, valuation
  - `StocksModule`: symbol search, quotes, history; market-data-sdk integration
  - `LeaderboardModule`: ranking computation + caching
  - `BrokerModule`: Groww API integration, TOTP authentication
  - `PaymentsModule`: Stripe/Razorpay integration + webhooks (future)
  - `NotificationsModule`: email templates and sending
  - `CacheModule`: Redis clients, rate limiting
  - `TasksModule`: BullMQ queues, scheduled jobs (cron)

- External Integrations:
  - Market Data SDK: reusable library with Groww, NSE, BSE providers
  - Broker APIs: Groww API for portfolio sync and holdings
  - Payments: Stripe globally; for India, Razorpay/Cashfree adapter via same interface
  - Email: SendGrid/Postmark via provider adapter

- Background Jobs:
  - Portfolio snapshot creation (daily)
  - Leaderboard recalculation (every 5 minutes for public portfolios)
  - Quotes refresh for active symbols (throttled; provider rate limits)
  - Broker portfolio sync (scheduled)

## 5. Data Model (PostgreSQL)

### 5.1 Entity Overview
- `users` (account + auth)
- `refresh_tokens` (optional, for refresh-token rotation)
- `portfolios_v2` (portfolio definition)
- `holdings` (per portfolio × symbol)
- `portfolio_transactions_v2` (buy/sell transactions)
- `portfolio_snapshots_v2` (daily portfolio snapshots)
- `leaderboard_entries` (portfolio rankings)
- `broker_accounts` (connected broker accounts)
- `broker_tokens` (broker API tokens)
- `stock_symbols` (reference universe)
- `stock_price_history` (historical price data)
- `payments` (subscription fees, future)
- `audit_logs` (administrative and sensitive actions)

### 5.2 Tables and Columns

users
- id: uuid pk
- email: citext unique not null
- password_hash: text not null
- display_name: varchar(100)
- avatar_url: text
- role: user|admin default 'user'
- status: active|suspended|deleted default 'active'
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

refresh_tokens
- id: uuid pk
- user_id: uuid fk → users(id)
- token_hash: text not null
- expires_at: timestamptz not null
- revoked_at: timestamptz null
- created_at: timestamptz default now()

portfolios_v2
- id: uuid pk
- user_id: uuid fk → users(id)
- name: varchar(120) not null
- visibility: public|unlisted|private default 'private'
- initial_value_cents: decimal(18,2) default 0
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

holdings
- id: uuid pk
- portfolio_id: uuid fk → portfolios_v2(id)
- symbol: varchar(20) not null
- exchange: varchar(10) not null
- quantity: varchar(20) not null
- avg_price_cents: decimal(18,2) not null
- current_value_cents: decimal(18,2) default 0
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

portfolio_transactions_v2
- id: uuid pk
- portfolio_id: uuid fk → portfolios_v2(id)
- symbol: varchar(20) not null
- exchange: varchar(10) not null
- quantity_delta: varchar(20) not null
- price_cents: decimal(18,2) not null
- fees_cents: decimal(18,2) default 0
- type: buy|sell not null
- created_at: timestamptz default now()

portfolio_snapshots_v2
- id: uuid pk
- portfolio_id: uuid fk → portfolios_v2(id)
- date: date not null
- market_value_cents: decimal(18,2) not null
- return_percent: decimal(8,4) not null
- created_at: timestamptz default now()

leaderboard_entries
- id: uuid pk
- portfolio_id: uuid fk → portfolios_v2(id)
- window: daily|weekly|monthly|all default 'all'
- rank: int not null
- return_percent: decimal(8,4) not null
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

broker_accounts
- id: uuid pk
- user_id: uuid fk → users(id)
- broker: groww|zerodha|upstox not null
- account_id: varchar(100) not null
- account_name: varchar(200)
- status: active|inactive default 'active'
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

broker_tokens
- id: uuid pk
- broker_account_id: uuid fk → broker_accounts(id)
- token_type: access|refresh not null
- token_value: text not null
- expires_at: timestamptz
- created_at: timestamptz default now()

stock_symbols
- id: uuid pk
- symbol: varchar(20) unique not null
- exchange: nse|bse not null
- name: varchar(200)
- isin: varchar(12)
- sector: varchar(100)
- created_at: timestamptz default now()

stock_price_history
- id: uuid pk
- symbol: varchar(20) not null
- as_of: timestamptz not null
- ltp: decimal(10,2) not null
- volume: bigint
- created_at: timestamptz default now()

payments
- id: uuid pk
- user_id: uuid fk → users(id)
- amount: decimal(18,2) not null
- currency: varchar(3) default 'INR'
- status: pending|completed|failed|refunded
- provider: stripe|razorpay
- provider_payment_id: varchar(200)
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

audit_logs
- id: uuid pk
- user_id: uuid fk → users(id) null
- action: varchar(100) not null
- resource_type: varchar(50) not null
- resource_id: uuid not null
- details: jsonb
- ip_address: inet
- user_agent: text
- created_at: timestamptz default now()

### 5.3 Indexes (non-exhaustive)
- users(email)
- portfolios_v2(user_id), portfolios_v2(visibility)
- holdings(portfolio_id), holdings(symbol)
- portfolio_transactions_v2(portfolio_id), portfolio_transactions_v2(type)
- portfolio_snapshots_v2(portfolio_id), portfolio_snapshots_v2(date)
- leaderboard_entries(portfolio_id), leaderboard_entries(window)
- broker_accounts(user_id), broker_accounts(broker)
- broker_tokens(broker_account_id)
- stock_symbols(symbol), stock_symbols(exchange)
- stock_price_history(symbol, as_of)
- payments(user_id), payments(status)

### 5.4 Constraints & Invariants
- Portfolio visibility must be valid (public, unlisted, private)
- Holding quantity and price must be positive
- Transaction fees must be non-negative
- Portfolio return percentage is calculated daily
- Leaderboard rankings are updated periodically

## 6. Business Logic
- User registration/authentication
- Portfolio creation and management
- Stock/Holding management (buy/sell)
- Real-time valuation and PnL calculation
- Leaderboard participation and tracking
- Broker API integration for portfolio sync
- Payment processing (future)

## 7. Redis Usage
- Keys:
  - `quotes:latest:{symbol}` → { priceCents, asOf }
  - `leaderboard:global` → array of {portfolioId, returnPercent, rank}
  - `ratelimit:user:{userId}:{route}` → counters with TTL
  - `session:refresh:{tokenId}` (optional)
- TTLs: quotes 5–15s; leaderboards 15–60s

## 8. API Design
- REST, JSON; OpenAPI 3.0 documented in `api-specification.json`
- Auth: Bearer JWT; refresh flow via `/auth/refresh`
- Pagination: cursor or offset; standard `page`, `pageSize`, `nextCursor`
- Errors: RFC7807-like envelope `{ code, message, details }`

## 9. Security
- Argon2id hashing; JWT RS256 or HS512; refresh token rotation
- Validation: `class-validator` DTOs; centralized exception filters
- Rate limiting per IP and per user; WAF/CDN recommended
- Sensitive fields never logged; PII minimization

## 10. Infrastructure & DevOps
- Docker images for api
- docker-compose for `postgres`, `redis`, `api`
- Migrations: TypeORM migrations (`npm run typeorm migration:generate`/`run`)
- CI: Node 20.x, lint, type-check, unit tests, e2e tests, build, Docker build, vulnerability scan
- CD: Deploy to container platform (Fly.io/Render/Heroku/AWS ECS/EKS)
- Config via env vars; 12-factor compliant

### 10.1 Environment Variables (example)
- DATABASE_URL
- REDIS_URL
- JWT_ACCESS_TTL=900
- JWT_REFRESH_TTL=2592000
- JWT_SECRET or RSA keys
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- EMAIL_PROVIDER_API_KEY
- STOCK_DATA_PROVIDER=polygon|finnhub|alpha
- STOCK_PROVIDER_API_KEY
- NODE_ENV

## 11. Observability
- Structured logs (JSON), request IDs, user IDs when available
- Health checks `/healthz` (liveness/readiness)
- Metrics: process stats, http durations, queue depths

## 12. Testing Strategy
- Unit tests for services and guards
- Integration tests with testcontainers for Postgres/Redis
- E2E tests for critical flows: signup/login, create portfolio, manage holdings, leaderboard

## 13. Migration Plan
- Initial schema migrations for all core tables
- Seeders: minimal `stock_symbols` as starter set
- Backfills: none required for MVP

## 14. Open Questions / Future Enhancements
- Advanced portfolio analytics (drawdowns, volatility)
- Social features (comments, follows, portfolio sharing)
- Advanced order types (limit/stop, OCO)
- KYC/AML for real-money payouts
- Multi-currency support
