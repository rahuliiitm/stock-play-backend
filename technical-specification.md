# StockPlay Backend Technical Specification (v0.8)

## 1. Overview
StockPlay is a stocks prediction and virtual trading contest platform. Users join time-bound contests, receive a virtual balance, place simulated trades on supported equities within the contest window, and compete on leaderboards based on portfolio value. This specification defines backend architecture, data model, APIs, integrations, and non-functional requirements to implement the platform using NestJS, PostgreSQL, and Redis.

- Primary stack: NestJS (TypeScript), PostgreSQL (RDS-ready), Redis (ElastiCache-ready)
- ORM: TypeORM
- Queue/Background jobs: BullMQ (Redis)
- Caching: Redis (quotes cache, leaderboards, user sessions/rate limits)
- Auth: JWT (access + refresh), Argon2 password hashing
- Observability: pino/winston logging, OpenTelemetry tracing compatible
- Deployment: Docker + docker-compose for local; CI/CD pipelines; containerized services
- Default currency: INR; support for rupee-based contest balances and fees

## 2. Functional Requirements
- Authentication: email/password auth with JWT access + refresh tokens; roles: user, admin
- User Profile: display name, avatar, basic settings
- Contests: create, schedule, activate, end; public/private; entry fee (optional); initial balance; allowed instruments; validation rules
- Participation: join contest (enforce capacity, fee, timing); one active portfolio per participant per contest
- Trading: market buy/sell simulated fills at provider quote; enforce trading windows (market hours + contest window); limits (max position per symbol, daily trade limit)
- Portfolio: cash balance, open positions, realized/unrealized PnL; mark-to-market via latest cached quote
- Leaderboard: rank participants by portfolio value; tie-breakers: higher cash, then earlier join time
- Stock Data: search symbols, get live quote, get historical candles; cache quotes; persist trade-time price snapshot for auditability
- Payments: Stripe/Razorpay for entry fees and payouts; webhook processing; refunds (for India, evaluate Razorpay or Cashfree)
- Notifications: transactional email (contest start/end, rank changes, payout notices) via SendGrid/Postmark
- Admin: user suspension, contest moderation, system flags

## 3. Non-Functional Requirements
- Performance: p95 < 200ms for cached reads; p95 < 400ms for write operations
- Availability: target 99.9% uptime
- Scalability: horizontal scaling via stateless NestJS pods; Redis/Postgres managed services
- Security: OWASP ASVS-aligned; TLS everywhere; at-rest encryption for DB backups; secrets in vault
- Compliance: GDPR-ready deletion, audit logging for critical actions; India-compliant payment flows and data residency where applicable
- Observability: structured logs, metrics (API latency, error rates), traces; audit logs for trades/payments

## 4. System Architecture
- API Gateway: Next.js (UI) calls NestJS REST API
- Services (NestJS modules):
  - `AuthModule`: local strategy, JWT issuance/refresh, password reset
  - `UsersModule`: profiles, admin controls
  - `ContestsModule`: CRUD, scheduling state machine (draft → scheduled → active → ended/cancelled)
  - `ParticipationModule`: joining, participant state
  - `PortfolioModule`: cash, positions, valuation
  - `TradesModule`: order intake, validation, execution (simulated fills)
  - `StocksModule`: symbol search, quotes, history; providers abstraction
  - `LeaderboardModule`: ranking computation + caching
  - `PaymentsModule`: Stripe/Razorpay integration + webhooks
  - `NotificationsModule`: email templates and sending
  - `CacheModule`: Redis clients, rate limiting
  - `TasksModule`: BullMQ queues, scheduled jobs (cron)

- External Integrations:
  - Stock data provider: Polygon.io / Finnhub / Alpha Vantage (configurable) via provider adapter interface
  - Payments: Stripe globally; for India, Razorpay/Cashfree adapter via same interface
  - Email: SendGrid/Postmark via provider adapter

- Background Jobs:
  - Contest lifecycle ticks (activate/end)
  - Leaderboard recalculation (e.g., every 30–60s during market hours)
  - Quotes refresh for active symbols (throttled; provider rate limits)
  - Payment reconciliation (Stripe/Razorpay events)

## 5. Data Model (PostgreSQL)

### 5.1 Entity Overview
- `users` (account + auth)
- `refresh_tokens` (optional, for refresh-token rotation)
- `contests` (contest definition)
- `contest_participants` (link user ↔ contest)
- `portfolios` (1 per participant)
- `positions` (per portfolio × symbol)
- `trades` (executions with price snapshots)
- `stock_symbols` (reference universe)
- `price_snapshots` (quote at trade time + optional periodic)
- `leaderboard_snapshots` (periodic aggregated standings)
- `payments` (entry fees, payouts, refunds)
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

contests
- id: uuid pk
- slug: varchar(80) unique not null
- name: varchar(140) not null
- description: text
- visibility: public|private default 'public'
- entry_fee_cents: int default 0
- currency: char(3) default 'INR'
- initial_balance_cents: int not null
- max_participants: int null
- starts_at: timestamptz not null
- ends_at: timestamptz not null
- status: draft|scheduled|active|ended|cancelled default 'draft'
- created_by_user_id: uuid fk → users(id)
- allowed_symbols: jsonb null (array of strings)
- trading_constraints: jsonb null
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

contest_participants
- id: uuid pk
- contest_id: uuid fk → contests(id)
- user_id: uuid fk → users(id)
- joined_at: timestamptz default now()
- paid_entry_fee: bool default false
- starting_balance_cents: int not null
- current_cash_cents: int not null
- last_value_cents: int default 0
- rank: int null
- UNIQUE(contest_id, user_id)

portfolios
- id: uuid pk
- participant_id: uuid fk → contest_participants(id) unique
- last_mark_to_market_cents: int default 0
- updated_at: timestamptz default now()

positions
- id: uuid pk
- portfolio_id: uuid fk → portfolios(id)
- symbol: varchar(16) not null
- quantity: numeric(18,4) not null
- avg_cost_cents: int not null
- open_value_cents: int not null
- current_value_cents: int default 0
- UNIQUE(portfolio_id, symbol)

trades
- id: uuid pk
- portfolio_id: uuid fk → portfolios(id)
- contest_id: uuid fk → contests(id)
- user_id: uuid fk → users(id)
- symbol: varchar(16) not null
- side: BUY|SELL not null
- quantity: numeric(18,4) not null
- price_cents: int not null
- notional_cents: int not null
- executed_at: timestamptz not null
- quote_source: varchar(32) not null
- provider_payload: jsonb null
- created_at: timestamptz default now()

stock_symbols
- symbol: varchar(16) pk
- name: text
- exchange: varchar(16)
- status: active|inactive default 'active'
- created_at: timestamptz default now()

price_snapshots
- id: uuid pk
- symbol: varchar(16) not null
- price_cents: int not null
- as_of: timestamptz not null
- source: varchar(32) not null
- provider_payload: jsonb null
- UNIQUE(symbol, as_of, source)

leaderboard_snapshots
- id: uuid pk
- contest_id: uuid fk → contests(id)
- as_of: timestamptz not null
- rankings: jsonb not null  -- array of {userId, portfolioValueCents, rank}
- created_at: timestamptz default now()

payments
- id: uuid pk
- user_id: uuid fk → users(id)
- contest_id: uuid fk → contests(id)
- type: entry_fee|payout|refund not null
- amount_cents: int not null
- currency: char(3) default 'USD'
- status: initiated|succeeded|failed|refunded not null
- stripe_payment_intent_id: varchar(128) null
- stripe_charge_id: varchar(128) null
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

audit_logs
- id: uuid pk
- actor_user_id: uuid fk → users(id) null
- action: varchar(64) not null  -- e.g., USER_SUSPEND, CONTEST_CREATE
- subject_type: varchar(64) not null
- subject_id: varchar(64) not null
- metadata: jsonb null
- created_at: timestamptz default now()

### 5.3 Indexes (non-exhaustive)
- users(email)
- contests(slug), contests(starts_at), contests(status)
- contest_participants(contest_id), contest_participants(user_id)
- positions(portfolio_id), positions(symbol)
- trades(portfolio_id), trades(contest_id), trades(symbol), trades(executed_at)
- price_snapshots(symbol, as_of)
- payments(user_id), payments(contest_id), payments(status)

### 5.4 Constraints & Invariants
- Contest time window must be valid (ends_at > starts_at, durations ≤ 90 days default)
- Participant must have unique (contest_id, user_id)
- Trading only allowed when contest.status = active and now() within [starts_at, ends_at] and market hours
- Cannot sell more than held quantity (no shorting in MVP)
- Position avg cost updates via VWAP formula on buy; selling reduces quantity and realizes PnL

## 6. Business Logic
- Join contest: verify status in [scheduled, active]; capacity; payment (if fee > 0) must be succeeded; create `contest_participants`, `portfolios`
- Place trade: validate symbol allowed; rate limit per user; fetch or compute fill price (from cached quote within N seconds); check cash for BUY or holdings for SELL; update `positions`, `contest_participants.current_cash_cents`, write `trades` with snapshot
- Leaderboard: compute portfolio value = cash + Σ(position.quantity × latest_price_cents); cache per contest; persist periodic snapshots
- End contest: freeze trading; final mark-to-market; rank; trigger payouts for top N if configured

## 7. Redis Usage
- Keys:
  - `quotes:latest:{symbol}` → { priceCents, asOf }
  - `leaderboard:contest:{contestId}` → array of {userId, valueCents, rank}
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
- E2E tests for critical flows: signup/login, create contest, join, trade, leaderboard

## 13. Migration Plan
- Initial schema migrations for all core tables
- Seeders: minimal `stock_symbols` as starter set
- Backfills: none required for MVP

## 14. Open Questions / Future Enhancements
- Options/crypto instruments
- Social features: comments, follows
- Advanced order types (limit/stop)
- KYC/AML for real-money payouts
- Multi-currency support
