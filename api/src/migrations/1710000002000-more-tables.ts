import { MigrationInterface, QueryRunner } from 'typeorm'

export class MoreTables1710000002000 implements MigrationInterface {
  name = 'MoreTables1710000002000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        contest_id uuid NOT NULL,
        type varchar(16) NOT NULL,
        amount_cents int NOT NULL,
        currency char(3) NOT NULL DEFAULT 'INR',
        status varchar(16) NOT NULL,
        stripe_payment_intent_id varchar(128),
        stripe_charge_id varchar(128),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id uuid,
        action varchar(64) NOT NULL,
        subject_type varchar(64) NOT NULL,
        subject_id varchar(64) NOT NULL,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id uuid NOT NULL,
        as_of timestamptz NOT NULL,
        rankings jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`)
    await queryRunner.query(`DROP TABLE IF EXISTS leaderboard_snapshots`)
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`)
    await queryRunner.query(`DROP TABLE IF EXISTS payments`)
  }
} 