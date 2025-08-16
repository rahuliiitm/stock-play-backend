import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixAmountDataTypes1710000003300 implements MigrationInterface {
  name = 'FixAmountDataTypes1710000003300'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change all amount fields from INTEGER to NUMERIC(18,2) for proper currency handling
    await queryRunner.query(`
      DO $$ BEGIN
        -- Contests table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contests' AND column_name = 'entry_fee_amount' AND data_type = 'integer') THEN
          ALTER TABLE contests ALTER COLUMN entry_fee_amount TYPE NUMERIC(18,2);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contests' AND column_name = 'initial_balance_amount' AND data_type = 'integer') THEN
          ALTER TABLE contests ALTER COLUMN initial_balance_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Contest participants table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'starting_balance_amount' AND data_type = 'integer') THEN
          ALTER TABLE contest_participants ALTER COLUMN starting_balance_amount TYPE NUMERIC(18,2);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'current_cash_amount' AND data_type = 'integer') THEN
          ALTER TABLE contest_participants ALTER COLUMN current_cash_amount TYPE NUMERIC(18,2);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'last_value_amount' AND data_type = 'integer') THEN
          ALTER TABLE contest_participants ALTER COLUMN last_value_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Portfolios table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'last_mark_to_market_amount' AND data_type = 'integer') THEN
          ALTER TABLE portfolios ALTER COLUMN last_mark_to_market_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Positions table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'avg_cost_amount' AND data_type = 'integer') THEN
          ALTER TABLE positions ALTER COLUMN avg_cost_amount TYPE NUMERIC(18,2);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'current_value_amount' AND data_type = 'integer') THEN
          ALTER TABLE positions ALTER COLUMN current_value_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Portfolio transactions table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_transactions' AND column_name = 'price_amount' AND data_type = 'integer') THEN
          ALTER TABLE portfolio_transactions ALTER COLUMN price_amount TYPE NUMERIC(18,2);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_transactions' AND column_name = 'value_amount' AND data_type = 'integer') THEN
          ALTER TABLE portfolio_transactions ALTER COLUMN value_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Portfolio results table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_results' AND column_name = 'total_value_amount' AND data_type = 'integer') THEN
          ALTER TABLE portfolio_results ALTER COLUMN total_value_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Trades table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'price_amount' AND data_type = 'integer') THEN
          ALTER TABLE trades ALTER COLUMN price_amount TYPE NUMERIC(18,2);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'notional_amount' AND data_type = 'integer') THEN
          ALTER TABLE trades ALTER COLUMN notional_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Price snapshots table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_snapshots' AND column_name = 'price_amount' AND data_type = 'integer') THEN
          ALTER TABLE price_snapshots ALTER COLUMN price_amount TYPE NUMERIC(18,2);
        END IF;
        
        -- Payments table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount_amount' AND data_type = 'integer') THEN
          ALTER TABLE payments ALTER COLUMN amount_amount TYPE NUMERIC(18,2);
        END IF;
      END $$;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to INTEGER (though this would lose precision)
    await queryRunner.query(`
      DO $$ BEGIN
        -- Contests table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contests' AND column_name = 'entry_fee_amount' AND data_type = 'numeric') THEN
          ALTER TABLE contests ALTER COLUMN entry_fee_amount TYPE INTEGER;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contests' AND column_name = 'initial_balance_amount' AND data_type = 'numeric') THEN
          ALTER TABLE contests ALTER COLUMN initial_balance_amount TYPE INTEGER;
        END IF;
        
        -- Contest participants table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'starting_balance_amount' AND data_type = 'numeric') THEN
          ALTER TABLE contest_participants ALTER COLUMN starting_balance_amount TYPE INTEGER;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'current_cash_amount' AND data_type = 'numeric') THEN
          ALTER TABLE contest_participants ALTER COLUMN current_cash_amount TYPE INTEGER;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'last_value_amount' AND data_type = 'numeric') THEN
          ALTER TABLE contest_participants ALTER COLUMN last_value_amount TYPE INTEGER;
        END IF;
        
        -- Portfolios table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'last_mark_to_market_amount' AND data_type = 'numeric') THEN
          ALTER TABLE portfolios ALTER COLUMN last_mark_to_market_amount TYPE INTEGER;
        END IF;
        
        -- Positions table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'avg_cost_amount' AND data_type = 'numeric') THEN
          ALTER TABLE positions ALTER COLUMN avg_cost_amount TYPE INTEGER;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'current_value_amount' AND data_type = 'numeric') THEN
          ALTER TABLE positions ALTER COLUMN current_value_amount TYPE INTEGER;
        END IF;
        
        -- Portfolio transactions table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_transactions' AND column_name = 'price_amount' AND data_type = 'numeric') THEN
          ALTER TABLE portfolio_transactions ALTER COLUMN price_amount TYPE INTEGER;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_transactions' AND column_name = 'value_amount' AND data_type = 'numeric') THEN
          ALTER TABLE portfolio_transactions ALTER COLUMN value_amount TYPE INTEGER;
        END IF;
        
        -- Portfolio results table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_results' AND column_name = 'total_value_amount' AND data_type = 'numeric') THEN
          ALTER TABLE portfolio_results ALTER COLUMN total_value_amount TYPE INTEGER;
        END IF;
        
        -- Trades table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'price_amount' AND data_type = 'numeric') THEN
          ALTER TABLE trades ALTER COLUMN price_amount TYPE INTEGER;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'notional_amount' AND data_type = 'numeric') THEN
          ALTER TABLE trades ALTER COLUMN notional_amount TYPE INTEGER;
        END IF;
        
        -- Price snapshots table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_snapshots' AND column_name = 'price_amount' AND data_type = 'numeric') THEN
          ALTER TABLE price_snapshots ALTER COLUMN price_amount TYPE INTEGER;
        END IF;
        
        -- Payments table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount_amount' AND data_type = 'numeric') THEN
          ALTER TABLE payments ALTER COLUMN amount_amount TYPE INTEGER;
        END IF;
      END $$;
    `)
  }
} 