import { MigrationInterface, QueryRunner } from 'typeorm'

export class ScoringEngine1710000002500 implements MigrationInterface {
  name = 'ScoringEngine1710000002500'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS participant_predictions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id uuid NOT NULL,
        user_id uuid NOT NULL,
        symbol text NOT NULL,
        prediction jsonb NOT NULL,
        submitted_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS market_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id uuid NOT NULL,
        symbol text NOT NULL,
        data jsonb NOT NULL,
        period_start timestamptz NOT NULL,
        period_end timestamptz NOT NULL,
        captured_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contest_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id uuid NOT NULL,
        user_id uuid NOT NULL,
        raw_result jsonb NOT NULL,
        score integer NOT NULL DEFAULT 0,
        rank integer NULL,
        error_margin double precision NULL,
        extra jsonb NULL,
        computed_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_participant_predictions_contest ON participant_predictions (contest_id);`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_participant_predictions_user ON participant_predictions (user_id);`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_market_results_contest ON market_results (contest_id);`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_market_results_symbol ON market_results (symbol);`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contest_results_contest ON contest_results (contest_id);`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contest_results_user ON contest_results (user_id);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contest_results;`)
    await queryRunner.query(`DROP TABLE IF EXISTS market_results;`)
    await queryRunner.query(`DROP TABLE IF EXISTS participant_predictions;`)
  }
} 