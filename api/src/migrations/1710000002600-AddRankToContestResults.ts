import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRankToContestResults1710000002600 implements MigrationInterface {
  name = 'AddRankToContestResults1710000002600'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contest_results ADD COLUMN IF NOT EXISTS "rank" integer NULL;`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op (safe)
  }
} 