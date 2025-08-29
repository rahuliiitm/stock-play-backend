import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveCentsSuffixes1756096300000 implements MigrationInterface {
  name = 'RemoveCentsSuffixes1756096300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update holdings table
    await queryRunner.query(`ALTER TABLE "holdings" RENAME COLUMN "avg_cost_cents" TO "avg_cost"`)
    await queryRunner.query(`ALTER TABLE "holdings" RENAME COLUMN "current_value_cents" TO "current_value"`)

    // Add initial_value column to portfolios_v2 table (it doesn't exist yet)
    await queryRunner.query(`ALTER TABLE "portfolios_v2" ADD COLUMN "initial_value" decimal(18,2) NOT NULL DEFAULT 0`)

    // Update portfolio_transactions_v2 table
    await queryRunner.query(`ALTER TABLE "portfolio_transactions_v2" RENAME COLUMN "price_cents" TO "price"`)
    await queryRunner.query(`ALTER TABLE "portfolio_transactions_v2" RENAME COLUMN "fees_cents" TO "fees"`)

    // Update portfolio_snapshots_v2 table
    await queryRunner.query(`ALTER TABLE "portfolio_snapshots_v2" RENAME COLUMN "market_value_cents" TO "market_value"`)
    await queryRunner.query(`ALTER TABLE "portfolio_snapshots_v2" RENAME COLUMN "invested_cents" TO "invested"`)
    await queryRunner.query(`ALTER TABLE "portfolio_snapshots_v2" RENAME COLUMN "pnl_cents" TO "pnl"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert holdings table
    await queryRunner.query(`ALTER TABLE "holdings" RENAME COLUMN "avg_cost" TO "avg_cost_cents"`)
    await queryRunner.query(`ALTER TABLE "holdings" RENAME COLUMN "current_value" TO "current_value_cents"`)

    // Remove initial_value column from portfolios_v2 table
    await queryRunner.query(`ALTER TABLE "portfolios_v2" DROP COLUMN "initial_value"`)

    // Revert portfolio_transactions_v2 table
    await queryRunner.query(`ALTER TABLE "portfolio_transactions_v2" RENAME COLUMN "price" TO "price_cents"`)
    await queryRunner.query(`ALTER TABLE "portfolio_transactions_v2" RENAME COLUMN "fees" TO "fees_cents"`)

    // Revert portfolio_snapshots_v2 table
    await queryRunner.query(`ALTER TABLE "portfolio_snapshots_v2" RENAME COLUMN "market_value" TO "market_value_cents"`)
    await queryRunner.query(`ALTER TABLE "portfolio_snapshots_v2" RENAME COLUMN "invested" TO "invested_cents"`)
    await queryRunner.query(`ALTER TABLE "portfolio_snapshots_v2" RENAME COLUMN "pnl" TO "pnl_cents"`)
  }
}
