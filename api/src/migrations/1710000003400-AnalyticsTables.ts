import { MigrationInterface, QueryRunner } from 'typeorm'

export class AnalyticsTables1710000003400 implements MigrationInterface {
  name = 'AnalyticsTables1710000003400'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create portfolio_performance table
    await queryRunner.query(`
      CREATE TABLE portfolio_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_id UUID NOT NULL,
        date DATE NOT NULL,
        period_type VARCHAR(10) NOT NULL,
        total_value_amount NUMERIC(18,2) NOT NULL,
        cash_amount NUMERIC(18,2) NOT NULL,
        positions_value_amount NUMERIC(18,2) NOT NULL,
        daily_return_percent NUMERIC(8,4) NOT NULL,
        cumulative_return_percent NUMERIC(8,4) NOT NULL,
        daily_pnl_amount NUMERIC(18,2) NOT NULL,
        cumulative_pnl_amount NUMERIC(18,2) NOT NULL,
        volatility NUMERIC(8,4),
        sharpe_ratio NUMERIC(8,4),
        max_drawdown_percent NUMERIC(8,4),
        benchmark_return_percent NUMERIC(8,4),
        alpha NUMERIC(8,4),
        beta NUMERIC(8,4),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_portfolio_performance_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
      )
    `)

    // Create indexes for portfolio_performance
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_portfolio_performance_portfolio_date 
      ON portfolio_performance (portfolio_id, date)
    `)
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_performance_portfolio_period_date 
      ON portfolio_performance (portfolio_id, period_type, date)
    `)

    // Create position_performance table
    await queryRunner.query(`
      CREATE TABLE position_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID NOT NULL,
        portfolio_id UUID NOT NULL,
        symbol VARCHAR(16) NOT NULL,
        date DATE NOT NULL,
        period_type VARCHAR(10) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL,
        avg_cost_amount NUMERIC(18,2) NOT NULL,
        market_price_amount NUMERIC(18,2) NOT NULL,
        market_value_amount NUMERIC(18,2) NOT NULL,
        daily_return_percent NUMERIC(8,4) NOT NULL,
        total_return_percent NUMERIC(8,4) NOT NULL,
        daily_pnl_amount NUMERIC(18,2) NOT NULL,
        unrealized_pnl_amount NUMERIC(18,2) NOT NULL,
        realized_pnl_amount NUMERIC(18,2) NOT NULL,
        weight_percent NUMERIC(8,4),
        contribution_to_return NUMERIC(8,4),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_position_performance_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
      )
    `)

    // Create indexes for position_performance
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_position_performance_position_date 
      ON position_performance (position_id, date)
    `)
    await queryRunner.query(`
      CREATE INDEX idx_position_performance_symbol_date 
      ON position_performance (symbol, date)
    `)
    await queryRunner.query(`
      CREATE INDEX idx_position_performance_portfolio_date 
      ON position_performance (portfolio_id, date)
    `)

    // Create market_movers table
    await queryRunner.query(`
      CREATE TABLE market_movers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(16) NOT NULL,
        company_name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        period_type VARCHAR(10) NOT NULL,
        mover_type VARCHAR(10) NOT NULL,
        current_price_amount NUMERIC(18,2) NOT NULL,
        previous_price_amount NUMERIC(18,2) NOT NULL,
        price_change_amount NUMERIC(18,2) NOT NULL,
        price_change_percent NUMERIC(8,4) NOT NULL,
        volume BIGINT,
        avg_volume BIGINT,
        portfolios_holding_count INTEGER NOT NULL,
        total_market_value_amount NUMERIC(18,2) NOT NULL,
        avg_portfolio_impact_amount NUMERIC(18,2) NOT NULL,
        rank INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    // Create indexes for market_movers
    await queryRunner.query(`
      CREATE INDEX idx_market_movers_date_period_type 
      ON market_movers (date, period_type, mover_type)
    `)
    await queryRunner.query(`
      CREATE INDEX idx_market_movers_symbol_date 
      ON market_movers (symbol, date)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS market_movers`)
    await queryRunner.query(`DROP TABLE IF EXISTS position_performance`)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_performance`)
  }
} 