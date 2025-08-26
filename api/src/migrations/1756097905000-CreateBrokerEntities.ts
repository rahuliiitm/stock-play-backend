import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBrokerEntities1756097905000 implements MigrationInterface {
    name = 'CreateBrokerEntities1756097905000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create broker_accounts table
        await queryRunner.query(`
            CREATE TABLE "broker_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "broker" varchar(16) NOT NULL,
                "account_id" varchar(64) NOT NULL,
                "account_name" varchar(100) NOT NULL,
                "status" varchar(16) NOT NULL DEFAULT 'active',
                "metadata" jsonb,
                "last_sync_at" TIMESTAMP WITH TIME ZONE,
                "last_sync_error" varchar(500),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_broker_accounts" PRIMARY KEY ("id")
            )
        `);

        // Create unique index on user_id, broker
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_broker_accounts_user_broker" ON "broker_accounts" ("user_id", "broker")
        `);

        // Create broker_tokens table
        await queryRunner.query(`
            CREATE TABLE "broker_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "broker_account_id" uuid NOT NULL,
                "token_type" varchar(16) NOT NULL,
                "token_value" text NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE,
                "metadata" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_broker_tokens" PRIMARY KEY ("id")
            )
        `);

        // Create unique index on broker_account_id, token_type
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_broker_tokens_account_type" ON "broker_tokens" ("broker_account_id", "token_type")
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "broker_accounts"
            ADD CONSTRAINT "FK_broker_accounts_user_id"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "broker_tokens"
            ADD CONSTRAINT "FK_broker_tokens_broker_account_id"
            FOREIGN KEY ("broker_account_id") REFERENCES "broker_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order (due to foreign key constraints)
        await queryRunner.query(`DROP TABLE "broker_tokens"`);
        await queryRunner.query(`DROP TABLE "broker_accounts"`);
    }
}

