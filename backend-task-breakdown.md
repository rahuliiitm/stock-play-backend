# Backend Task Breakdown (12 Weeks, 6 Phases)

Stack: NestJS, TypeScript, TypeORM, PostgreSQL, Redis, BullMQ, Stripe, SendGrid/Postmark

Assumptions: 1 BE Lead, 1 BE Engineer, 1 QA, 0.2 DevOps. Estimates are person-days (pd). Priorities: P0 critical, P1 important, P2 nice-to-have.

## Phase 1 (Weeks 1–2): Foundations (P0)
Deliverables: repo skeleton, CI, local env, auth baseline, initial schema.

Tasks
- Project bootstrap (NestJS mono-repo or single service) [2 pd]
- Core modules scaffolding (Auth, Users, Contests, Participation, Trades, Stocks, Leaderboard, Payments, Notifications) [3 pd]
- TypeORM setup, initial entities, migration pipeline [2 pd]
- Database schema v1 (all tables from spec) [3 pd]
- Redis integration, CacheModule, rate limiting guard [2 pd]
- Auth: signup/login, JWT (access+refresh), Argon2, guards, e2e tests [4 pd]
- CI pipeline (lint, typecheck, unit, e2e, docker build) [2 pd]
- docker-compose with Postgres/Redis/API [1 pd]

## Phase 2 (Weeks 3–4): Contests & Participation (P0)
Deliverables: contest lifecycle and joining flow.

Tasks
- Contests CRUD, slugging, validation, state machine (draft→scheduled→active→ended) [4 pd]
- Participation: join contest, capacity checks, portfolio creation [3 pd]
- Admin permissions, RBAC decorators [2 pd]
- API pagination & error envelope standardization [1 pd]
- Unit/e2e tests for flows [3 pd]

## Phase 3 (Weeks 5–6): Trading & Portfolios (P0)
Deliverables: trade execution logic with simulated fills, portfolio accounting.

Tasks
- Stocks provider abstraction + first provider (Polygon/Finnhub) [3 pd]
- Quote caching in Redis; price snapshot persistence [2 pd]
- Trade DTOs, validation (market hours, contest window, limits) [3 pd]
- Execution service: cash/holdings checks, position avg-cost updates [4 pd]
- Portfolio valuation service; nightly reconciliation job [2 pd]
- e2e tests for buy/sell and portfolio math [3 pd]

## Phase 4 (Weeks 7–8): Leaderboards, Payments, Notifications (P1)
Deliverables: live leaderboard, Stripe entry fees, email notifications.

Tasks
- Leaderboard compute + caching; snapshots; API endpoints [3 pd]
- Stripe integration: entry fee intents, webhook handling, recon [4 pd]
- Email provider integration; templates for join/start/end [2 pd]
- Background jobs: leaderboard refresh, contest activation/ending [2 pd]
- Monitoring: health checks, basic metrics [1 pd]
- Tests for payments/webhooks and leaderboard ranking [3 pd]

## Phase 5 (Weeks 9–10): Hardening & Admin (P1)
Deliverables: admin tools, audit logging, performance passes.

Tasks
- Admin endpoints (suspend user, cancel contest, refunds) [3 pd]
- Audit logging for sensitive actions [2 pd]
- Rate limiting policies finalized + tests [2 pd]
- Load test baseline (k6/Artillery) + performance tuning [3 pd]
- Security pass: headers, input validation, secrets handling [2 pd]

## Phase 6 (Weeks 11–12): Stabilization & Release (P0)
Deliverables: release candidate, documentation, runbooks.

Tasks
- Bug triage/fixes from QA [4 pd]
- E2E test coverage for critical paths (CI) [3 pd]
- Operational docs: runbooks, dashboards, alerts [2 pd]
- Migration scripts finalization and seed data [2 pd]
- Production readiness review + go-live checklist [2 pd]

## Cross-Cutting Deliverables
- API Spec maintained in `api-specification.json`
- Technical spec maintained in `technical-specification.md`
- ENV + config docs; secret management strategy

## Resource Plan
- BE Lead: architecture, reviews, sensitive features
- BE Engineer: feature implementation, tests
- QA: test plans, e2e, regression
- DevOps: CI/CD, infra, observability

## Risks & Mitigations
- Stock data rate limits → cache, symbol scoping
- Payment failures → robust webhook handling, retries
- Market-hour dependence → simulate or mock provider for tests

## Success Criteria
- 99.9% uptime target; p95 API latency within targets
- Complete contest → join → trade → leaderboard flow in production
- Stripe webhooks processed reliably (<1 min) with retries
- Comprehensive test coverage for business-critical logic
