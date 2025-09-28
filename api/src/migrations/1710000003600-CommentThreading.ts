import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentThreading1710000003600 implements MigrationInterface {
  name = 'CommentThreading1710000003600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_comments' AND column_name = 'parent_id'
        ) THEN
          ALTER TABLE portfolio_comments ADD COLUMN parent_id UUID NULL;
          ALTER TABLE portfolio_comments ADD CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES portfolio_comments(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_comments' AND column_name = 'root_id'
        ) THEN
          ALTER TABLE portfolio_comments ADD COLUMN root_id UUID NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_comments' AND column_name = 'depth'
        ) THEN
          ALTER TABLE portfolio_comments ADD COLUMN depth SMALLINT NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_comments_parent ON portfolio_comments(parent_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_comments_parent`);
    await queryRunner.query(
      `ALTER TABLE portfolio_comments DROP CONSTRAINT IF EXISTS fk_comment_parent`,
    );
    await queryRunner.query(
      `ALTER TABLE portfolio_comments DROP COLUMN IF EXISTS parent_id`,
    );
    await queryRunner.query(
      `ALTER TABLE portfolio_comments DROP COLUMN IF EXISTS root_id`,
    );
    await queryRunner.query(
      `ALTER TABLE portfolio_comments DROP COLUMN IF EXISTS depth`,
    );
  }
}
