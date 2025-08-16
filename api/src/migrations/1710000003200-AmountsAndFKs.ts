import { MigrationInterface, QueryRunner } from 'typeorm'

export class AmountsAndFKs1710000003200 implements MigrationInterface {
  name = 'AmountsAndFKs1710000003200'

  private async renameIfExists(qr: QueryRunner, table: string, from: string, to: string) {
    await qr.query(`DO $$ BEGIN IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${from}'
    ) THEN EXECUTE 'ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}'; END IF; END $$;`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename money columns to *_amount (idempotent)
    await this.renameIfExists(queryRunner, 'contests', 'entry_fee_cents', 'entry_fee_amount')
    await this.renameIfExists(queryRunner, 'contests', 'initial_balance_cents', 'initial_balance_amount')

    await this.renameIfExists(queryRunner, 'contest_participants', 'starting_balance_cents', 'starting_balance_amount')
    await this.renameIfExists(queryRunner, 'contest_participants', 'current_cash_cents', 'current_cash_amount')
    await this.renameIfExists(queryRunner, 'contest_participants', 'last_value_cents', 'last_value_amount')

    await this.renameIfExists(queryRunner, 'portfolios', 'last_mark_to_market_cents', 'last_mark_to_market_amount')

    await this.renameIfExists(queryRunner, 'positions', 'avg_cost_cents', 'avg_cost_amount')
    await this.renameIfExists(queryRunner, 'positions', 'current_value_cents', 'current_value_amount')
    // Drop unused open_value
    await queryRunner.query(`DO $$ BEGIN IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='positions' AND column_name='open_value_cents'
    ) THEN EXECUTE 'ALTER TABLE positions DROP COLUMN open_value_cents'; END IF; END $$;`)

    await this.renameIfExists(queryRunner, 'portfolio_transactions', 'price_cents', 'price_amount')
    await this.renameIfExists(queryRunner, 'portfolio_transactions', 'value_cents', 'value_amount')

    await this.renameIfExists(queryRunner, 'portfolio_results', 'total_value_cents', 'total_value_amount')

    await this.renameIfExists(queryRunner, 'trades', 'price_cents', 'price_amount')
    await this.renameIfExists(queryRunner, 'trades', 'notional_cents', 'notional_amount')

    await this.renameIfExists(queryRunner, 'price_snapshots', 'price_cents', 'price_amount')

    // Payments
    await this.renameIfExists(queryRunner, 'payments', 'amount_cents', 'amount')

    // Foreign keys (guard with existence checks)
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_cp_user'
      ) THEN
        ALTER TABLE contest_participants ADD CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
    END $$;`)
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_cp_contest'
      ) THEN
        ALTER TABLE contest_participants ADD CONSTRAINT fk_cp_contest FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE;
      END IF;
    END $$;`)

    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_portfolio_participant'
      ) THEN
        ALTER TABLE portfolios ADD CONSTRAINT fk_portfolio_participant FOREIGN KEY (participant_id) REFERENCES contest_participants(id) ON DELETE CASCADE;
      END IF;
    END $$;`)

    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_position_portfolio'
      ) THEN
        ALTER TABLE positions ADD CONSTRAINT fk_position_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;
      END IF;
    END $$;`)

    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_pt_portfolio'
      ) THEN
        ALTER TABLE portfolio_transactions ADD CONSTRAINT fk_pt_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;
      END IF;
    END $$;`)

    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_pr_participant'
      ) THEN
        ALTER TABLE portfolio_results ADD CONSTRAINT fk_pr_participant FOREIGN KEY (participant_id) REFERENCES contest_participants(id) ON DELETE CASCADE;
      END IF;
    END $$;`)

    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_price_history' AND column_name='exchange') THEN
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_sph_symbol'
          ) THEN
            ALTER TABLE stock_price_history ADD CONSTRAINT fk_sph_symbol FOREIGN KEY (symbol, exchange) REFERENCES stock_symbols(symbol, exchange) ON DELETE NO ACTION;
          END IF;
        END;
      END IF;
    END $$;`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Omit down for brevity
  }
} 