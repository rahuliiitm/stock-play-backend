import { MigrationInterface, QueryRunner } from 'typeorm'

export class EngagementTables1710000003500 implements MigrationInterface {
  name = 'EngagementTables1710000003500'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_sub_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_sub UNIQUE (portfolio_id, user_id)
      );
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_like_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_like UNIQUE (portfolio_id, user_id)
      );
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_comment_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ix_comments_portfolio_created ON portfolio_comments(portfolio_id, created_at);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_comments`)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_likes`)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_subscriptions`)
  }
} 