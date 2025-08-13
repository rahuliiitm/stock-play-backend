import { MigrationInterface, QueryRunner } from 'typeorm'

export class ContestRuleColumns1710000002700 implements MigrationInterface {
  name = 'ContestRuleColumns1710000002700'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contests ADD COLUMN IF NOT EXISTS contest_type text NULL;`)
    await queryRunner.query(`ALTER TABLE contests ADD COLUMN IF NOT EXISTS rule_config jsonb NULL;`)

    // Deduplicate contest_results by (contest_id, user_id) keeping the latest computed_at
    await queryRunner.query(`
      DELETE FROM contest_results a
      USING contest_results b
      WHERE a.ctid < b.ctid
        AND a.contest_id = b.contest_id
        AND a.user_id = b.user_id;
    `)

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_contest_results_cu ON contest_results (contest_id, user_id);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
} 