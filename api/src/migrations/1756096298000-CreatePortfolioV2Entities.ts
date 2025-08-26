import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePortfolioV2Entities1756096298000 implements MigrationInterface {
    name = 'CreatePortfolioV2Entities1756096298000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create portfolios_v2 table
        await queryRunner.query(`
            CREATE TABLE "portfolios_v2" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "name" varchar(120) NOT NULL,
                "visibility" varchar(16) NOT NULL DEFAULT 'private',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5d0f6a7b8e3d4c9f8a1b2c3d4e5" PRIMARY KEY ("id")
            )
        `);

        // Create unique index on user_id, name
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_portfolios_v2_user_id_name" ON "portfolios_v2" ("user_id", "name")
        `);

        // Create holdings table
        await queryRunner.query(`
            CREATE TABLE "holdings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "portfolio_id" uuid NOT NULL,
                "symbol" varchar(16) NOT NULL,
                "exchange" varchar(8) NOT NULL DEFAULT 'NSE',
                "quantity" numeric(18,4) NOT NULL,
                "avg_cost_cents" decimal(18,2) NOT NULL,
                "current_value_cents" decimal(18,2) NOT NULL DEFAULT 0,
                CONSTRAINT "PK_holdings" PRIMARY KEY ("id")
            )
        `);

        // Create unique index on portfolio_id, symbol
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_holdings_portfolio_symbol" ON "holdings" ("portfolio_id", "symbol")
        `);

        // Create portfolio_transactions_v2 table
        await queryRunner.query(`
            CREATE TABLE "portfolio_transactions_v2" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "portfolio_id" uuid NOT NULL,
                "symbol" varchar(16),
                "exchange" varchar(8),
                "quantity_delta" numeric(18,4),
                "price_cents" decimal(18,2),
                "fees_cents" decimal(18,2),
                "type" varchar(16) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_portfolio_transactions_v2" PRIMARY KEY ("id")
            )
        `);

        // Create index on portfolio_id, created_at
        await queryRunner.query(`
            CREATE INDEX "IDX_portfolio_transactions_v2_portfolio_created" ON "portfolio_transactions_v2" ("portfolio_id", "created_at")
        `);

        // Create portfolio_snapshots_v2 table
        await queryRunner.query(`
            CREATE TABLE "portfolio_snapshots_v2" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "portfolio_id" uuid NOT NULL,
                "date" date NOT NULL,
                "market_value_cents" decimal(18,2) NOT NULL,
                "invested_cents" decimal(18,2) NOT NULL,
                "pnl_cents" decimal(18,2) NOT NULL,
                "return_percent" decimal(8,4) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_portfolio_snapshots_v2" PRIMARY KEY ("id")
            )
        `);

        // Create unique index on portfolio_id, date
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_portfolio_snapshots_v2_portfolio_date" ON "portfolio_snapshots_v2" ("portfolio_id", "date")
        `);

        // Create leaderboard_entries table
        await queryRunner.query(`
            CREATE TABLE "leaderboard_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "portfolio_id" uuid NOT NULL,
                "window" varchar(8) NOT NULL,
                "rank" int NOT NULL,
                "return_percent" decimal(8,4) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_leaderboard_entries" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for leaderboard
        await queryRunner.query(`
            CREATE INDEX "IDX_leaderboard_entries_window_rank" ON "leaderboard_entries" ("window", "rank")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_leaderboard_entries_portfolio_window" ON "leaderboard_entries" ("portfolio_id", "window")
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "portfolios_v2"
            ADD CONSTRAINT "FK_portfolios_v2_user_id"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "holdings"
            ADD CONSTRAINT "FK_holdings_portfolio_id"
            FOREIGN KEY ("portfolio_id") REFERENCES "portfolios_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "portfolio_transactions_v2"
            ADD CONSTRAINT "FK_portfolio_transactions_v2_portfolio_id"
            FOREIGN KEY ("portfolio_id") REFERENCES "portfolios_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "portfolio_snapshots_v2"
            ADD CONSTRAINT "FK_portfolio_snapshots_v2_portfolio_id"
            FOREIGN KEY ("portfolio_id") REFERENCES "portfolios_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "leaderboard_entries"
            ADD CONSTRAINT "FK_leaderboard_entries_portfolio_id"
            FOREIGN KEY ("portfolio_id") REFERENCES "portfolios_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order (due to foreign key constraints)
        await queryRunner.query(`DROP TABLE "leaderboard_entries"`);
        await queryRunner.query(`DROP TABLE "portfolio_snapshots_v2"`);
        await queryRunner.query(`DROP TABLE "portfolio_transactions_v2"`);
        await queryRunner.query(`DROP TABLE "holdings"`);
        await queryRunner.query(`DROP TABLE "portfolios_v2"`);
    }
}

