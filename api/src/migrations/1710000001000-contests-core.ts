import { MigrationInterface, QueryRunner } from 'typeorm'

export class ContestsCore1710000001000 implements MigrationInterface {
  name = 'ContestsCore1710000001000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(80) UNIQUE NOT NULL,
        name varchar(140) NOT NULL,
        description text,
        visibility varchar(16) NOT NULL DEFAULT 'public',
        entry_fee_cents int NOT NULL DEFAULT 0,
        currency char(3) NOT NULL DEFAULT 'USD',
        initial_balance_cents int NOT NULL,
        max_participants int,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'draft',
        created_by_user_id uuid NOT NULL,
        allowed_symbols jsonb,
        trading_constraints jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contest_participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id uuid NOT NULL,
        user_id uuid NOT NULL,
        joined_at timestamptz NOT NULL DEFAULT now(),
        paid_entry_fee boolean NOT NULL DEFAULT false,
        starting_balance_cents int NOT NULL,
        current_cash_cents int NOT NULL,
        last_value_cents int NOT NULL DEFAULT 0,
        rank int,
        UNIQUE (contest_id, user_id)
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contest_participants_contest ON contest_participants(contest_id)`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_id uuid UNIQUE NOT NULL,
        last_mark_to_market_cents int NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id uuid NOT NULL,
        symbol varchar(16) NOT NULL,
        quantity numeric(18,4) NOT NULL,
        avg_cost_cents int NOT NULL,
        open_value_cents int NOT NULL,
        current_value_cents int NOT NULL DEFAULT 0,
        UNIQUE (portfolio_id, symbol)
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id uuid NOT NULL,
        contest_id uuid NOT NULL,
        user_id uuid NOT NULL,
        symbol varchar(16) NOT NULL,
        side varchar(4) NOT NULL,
        quantity numeric(18,4) NOT NULL,
        price_cents int NOT NULL,
        notional_cents int NOT NULL,
        executed_at timestamptz NOT NULL,
        quote_source varchar(32) NOT NULL,
        provider_payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_symbols (
        symbol varchar(16) PRIMARY KEY,
        name text,
        exchange varchar(16),
        status varchar(16) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS price_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol varchar(16) NOT NULL,
        price_cents int NOT NULL,
        as_of timestamptz NOT NULL,
        source varchar(32) NOT NULL,
        provider_payload jsonb,
        UNIQUE (symbol, as_of, source)
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS price_snapshots`)
    await queryRunner.query(`DROP TABLE IF EXISTS stock_symbols`)
    await queryRunner.query(`DROP TABLE IF EXISTS trades`)
    await queryRunner.query(`DROP TABLE IF EXISTS positions`)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolios`)
    await queryRunner.query(`DROP TABLE IF EXISTS contest_participants`)
    await queryRunner.query(`DROP TABLE IF EXISTS contests`)
  }
} 