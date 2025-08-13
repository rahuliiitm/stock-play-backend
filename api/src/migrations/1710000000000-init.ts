import { MigrationInterface, QueryRunner } from "typeorm"

export class Init1710000000000 implements MigrationInterface {
  name = 'Init1710000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email citext UNIQUE NOT NULL,
        password_hash text NOT NULL,
        display_name varchar(100),
        avatar_url text,
        role varchar(16) NOT NULL DEFAULT 'user',
        status varchar(16) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
  }
} 