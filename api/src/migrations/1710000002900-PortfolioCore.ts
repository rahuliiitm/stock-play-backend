import { MigrationInterface, QueryRunner } from 'typeorm'

export class PortfolioCore1710000002900 implements MigrationInterface {
  name = 'PortfolioCore1710000002900'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id uuid NOT NULL,
        symbol varchar(16) NOT NULL,
        quantity_delta numeric(18,4) NOT NULL,
        price_cents integer NOT NULL,
        value_cents integer NOT NULL,
        type varchar(16) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ix_pt_portfolio_created ON portfolio_transactions(portfolio_id, created_at);`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id uuid NOT NULL,
        participant_id uuid NOT NULL,
        as_of timestamptz NOT NULL,
        total_value_cents integer NOT NULL,
        return_percent double precision NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_pr_contest_participant_asof ON portfolio_results(contest_id, participant_id, as_of);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_results;`)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_transactions;`)
  }
} 