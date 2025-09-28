import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePortfolioSchedulerTables1756096400000
  implements MigrationInterface
{
  name = 'CreatePortfolioSchedulerTables1756096400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create broker_accounts table
    await queryRunner.query(`
            CREATE TABLE "broker_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "broker_name" varchar(50) NOT NULL,
                "account_id" varchar(100) NOT NULL,
                "api_key" varchar(255) NOT NULL,
                "api_secret" varchar(255) NOT NULL,
                "access_token" text,
                "token_expires_at" timestamptz,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" timestamptz NOT NULL DEFAULT now(),
                "updated_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_broker_accounts" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_broker_accounts_user_broker_account" UNIQUE ("user_id", "broker_name", "account_id")
            )
        `);

    // Create real_holdings table
    await queryRunner.query(`
            CREATE TABLE "real_holdings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "broker_account_id" uuid NOT NULL,
                "symbol" varchar(20) NOT NULL,
                "exchange" varchar(10) NOT NULL DEFAULT 'NSE',
                "isin" varchar(20),
                "quantity" decimal(18,4) NOT NULL,
                "average_price" decimal(18,2) NOT NULL,
                "current_price" decimal(18,2),
                "current_value" decimal(18,2),
                "pledge_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "demat_locked_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "groww_locked_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "last_updated_at" timestamptz NOT NULL DEFAULT now(),
                "created_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_real_holdings" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_real_holdings_broker_symbol" UNIQUE ("broker_account_id", "symbol", "exchange")
            )
        `);

    // Create real_positions table
    await queryRunner.query(`
            CREATE TABLE "real_positions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "broker_account_id" uuid NOT NULL,
                "symbol" varchar(20) NOT NULL,
                "exchange" varchar(10) NOT NULL DEFAULT 'NSE',
                "segment" varchar(10) NOT NULL DEFAULT 'CASH',
                "credit_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "credit_price" decimal(18,2) NOT NULL DEFAULT 0,
                "debit_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "debit_price" decimal(18,2) NOT NULL DEFAULT 0,
                "carry_forward_credit_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "carry_forward_credit_price" decimal(18,2) NOT NULL DEFAULT 0,
                "carry_forward_debit_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "carry_forward_debit_price" decimal(18,2) NOT NULL DEFAULT 0,
                "net_quantity" decimal(18,4) GENERATED ALWAYS AS (credit_quantity - debit_quantity) STORED,
                "net_price" decimal(18,2) GENERATED ALWAYS AS (
                    CASE 
                        WHEN (credit_quantity - debit_quantity) > 0 THEN credit_price
                        WHEN (credit_quantity - debit_quantity) < 0 THEN debit_price
                        ELSE 0
                    END
                ) STORED,
                "last_updated_at" timestamptz NOT NULL DEFAULT now(),
                "created_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_real_positions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_real_positions_broker_symbol_segment" UNIQUE ("broker_account_id", "symbol", "exchange", "segment")
            )
        `);

    // Create order_history table
    await queryRunner.query(`
            CREATE TABLE "order_history" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "broker_account_id" uuid NOT NULL,
                "groww_order_id" varchar(100) NOT NULL,
                "order_reference_id" varchar(100),
                "symbol" varchar(20) NOT NULL,
                "exchange" varchar(10) NOT NULL DEFAULT 'NSE',
                "segment" varchar(10) NOT NULL DEFAULT 'CASH',
                "product" varchar(10) NOT NULL,
                "order_type" varchar(20) NOT NULL,
                "transaction_type" varchar(10) NOT NULL,
                "quantity" decimal(18,4) NOT NULL,
                "price" decimal(18,2),
                "trigger_price" decimal(18,2),
                "validity" varchar(10) NOT NULL,
                "order_status" varchar(20) NOT NULL,
                "filled_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "remaining_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "average_fill_price" decimal(18,2),
                "deliverable_quantity" decimal(18,4) NOT NULL DEFAULT 0,
                "amo_status" varchar(20),
                "created_at" timestamptz NOT NULL,
                "exchange_time" timestamptz,
                "trade_date" timestamptz,
                "remark" text,
                "detected_at" timestamptz NOT NULL DEFAULT now(),
                "sync_batch_id" uuid,
                CONSTRAINT "PK_order_history" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_order_history_groww_order_id" UNIQUE ("groww_order_id")
            )
        `);

    // Create order_quantity_changes table
    await queryRunner.query(`
            CREATE TABLE "order_quantity_changes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "order_history_id" uuid NOT NULL,
                "symbol" varchar(20) NOT NULL,
                "change_type" varchar(20) NOT NULL,
                "previous_quantity" decimal(18,4),
                "new_quantity" decimal(18,4),
                "quantity_delta" decimal(18,4) NOT NULL,
                "price_at_change" decimal(18,2),
                "change_reason" varchar(100),
                "detected_at" timestamptz NOT NULL DEFAULT now(),
                "sync_batch_id" uuid,
                CONSTRAINT "PK_order_quantity_changes" PRIMARY KEY ("id")
            )
        `);

    // Create portfolio_snapshots table
    await queryRunner.query(`
            CREATE TABLE "portfolio_snapshots" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "broker_account_id" uuid NOT NULL,
                "snapshot_date" date NOT NULL,
                "total_holdings_value" decimal(18,2) NOT NULL,
                "total_positions_value" decimal(18,2) NOT NULL,
                "total_portfolio_value" decimal(18,2) NOT NULL,
                "cash_balance" decimal(18,2),
                "margin_used" decimal(18,2),
                "margin_available" decimal(18,2),
                "day_change" decimal(18,2),
                "day_change_percent" decimal(8,4),
                "holdings_count" integer NOT NULL,
                "positions_count" integer NOT NULL,
                "orders_count" integer NOT NULL,
                "trades_count" integer NOT NULL,
                "created_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_portfolio_snapshots" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_portfolio_snapshots_broker_date" UNIQUE ("broker_account_id", "snapshot_date")
            )
        `);

    // Create sync_batches table
    await queryRunner.query(`
            CREATE TABLE "sync_batches" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "broker_account_id" uuid NOT NULL,
                "sync_type" varchar(50) NOT NULL,
                "status" varchar(20) NOT NULL,
                "started_at" timestamptz NOT NULL DEFAULT now(),
                "completed_at" timestamptz,
                "holdings_fetched" integer NOT NULL DEFAULT 0,
                "positions_fetched" integer NOT NULL DEFAULT 0,
                "orders_fetched" integer NOT NULL DEFAULT 0,
                "holdings_updated" integer NOT NULL DEFAULT 0,
                "positions_updated" integer NOT NULL DEFAULT 0,
                "orders_created" integer NOT NULL DEFAULT 0,
                "quantity_changes_detected" integer NOT NULL DEFAULT 0,
                "errors_count" integer NOT NULL DEFAULT 0,
                "error_details" jsonb,
                "metadata" jsonb,
                CONSTRAINT "PK_sync_batches" PRIMARY KEY ("id")
            )
        `);

    // Create indexes for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_order_history_broker_symbol" ON "order_history" ("broker_account_id", "symbol")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_history_groww_order_id" ON "order_history" ("groww_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_history_created_at" ON "order_history" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_history_sync_batch" ON "order_history" ("sync_batch_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_order_quantity_changes_symbol" ON "order_quantity_changes" ("symbol")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_quantity_changes_detected_at" ON "order_quantity_changes" ("detected_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_quantity_changes_sync_batch" ON "order_quantity_changes" ("sync_batch_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_portfolio_snapshots_date" ON "portfolio_snapshots" ("snapshot_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portfolio_snapshots_broker" ON "portfolio_snapshots" ("broker_account_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_sync_batches_broker" ON "sync_batches" ("broker_account_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sync_batches_started_at" ON "sync_batches" ("started_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sync_batches_status" ON "sync_batches" ("status")`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "broker_accounts" ADD CONSTRAINT "FK_broker_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_holdings" ADD CONSTRAINT "FK_real_holdings_broker_account_id" FOREIGN KEY ("broker_account_id") REFERENCES "broker_accounts"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_positions" ADD CONSTRAINT "FK_real_positions_broker_account_id" FOREIGN KEY ("broker_account_id") REFERENCES "broker_accounts"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_history" ADD CONSTRAINT "FK_order_history_broker_account_id" FOREIGN KEY ("broker_account_id") REFERENCES "broker_accounts"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_quantity_changes" ADD CONSTRAINT "FK_order_quantity_changes_order_history_id" FOREIGN KEY ("order_history_id") REFERENCES "order_history"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "FK_portfolio_snapshots_broker_account_id" FOREIGN KEY ("broker_account_id") REFERENCES "broker_accounts"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "sync_batches" ADD CONSTRAINT "FK_sync_batches_broker_account_id" FOREIGN KEY ("broker_account_id") REFERENCES "broker_accounts"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "sync_batches" DROP CONSTRAINT "FK_sync_batches_broker_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio_snapshots" DROP CONSTRAINT "FK_portfolio_snapshots_broker_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_quantity_changes" DROP CONSTRAINT "FK_order_quantity_changes_order_history_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_history" DROP CONSTRAINT "FK_order_history_broker_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_positions" DROP CONSTRAINT "FK_real_positions_broker_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_holdings" DROP CONSTRAINT "FK_real_holdings_broker_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "broker_accounts" DROP CONSTRAINT "FK_broker_accounts_user_id"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_sync_batches_status"`);
    await queryRunner.query(`DROP INDEX "IDX_sync_batches_started_at"`);
    await queryRunner.query(`DROP INDEX "IDX_sync_batches_broker"`);
    await queryRunner.query(`DROP INDEX "IDX_portfolio_snapshots_broker"`);
    await queryRunner.query(`DROP INDEX "IDX_portfolio_snapshots_date"`);
    await queryRunner.query(
      `DROP INDEX "IDX_order_quantity_changes_sync_batch"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_order_quantity_changes_detected_at"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_order_quantity_changes_symbol"`);
    await queryRunner.query(`DROP INDEX "IDX_order_history_sync_batch"`);
    await queryRunner.query(`DROP INDEX "IDX_order_history_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_order_history_groww_order_id"`);
    await queryRunner.query(`DROP INDEX "IDX_order_history_broker_symbol"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "sync_batches"`);
    await queryRunner.query(`DROP TABLE "portfolio_snapshots"`);
    await queryRunner.query(`DROP TABLE "order_quantity_changes"`);
    await queryRunner.query(`DROP TABLE "order_history"`);
    await queryRunner.query(`DROP TABLE "real_positions"`);
    await queryRunner.query(`DROP TABLE "real_holdings"`);
    await queryRunner.query(`DROP TABLE "broker_accounts"`);
  }
}
