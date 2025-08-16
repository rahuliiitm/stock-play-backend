import { MigrationInterface, QueryRunner } from 'typeorm'

export class StockSymbolsCompositeKey1710000003100 implements MigrationInterface {
  name = 'StockSymbolsCompositeKey1710000003100'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stock_symbols DROP CONSTRAINT IF EXISTS stock_symbols_pkey`)
    // Ensure exchange is not null
    await queryRunner.query(`UPDATE stock_symbols SET exchange = COALESCE(exchange, 'NSE')`)
    await queryRunner.query(`ALTER TABLE stock_symbols ALTER COLUMN exchange SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE stock_symbols ADD PRIMARY KEY (symbol, exchange)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stock_symbols DROP CONSTRAINT IF EXISTS stock_symbols_pkey`)
    await queryRunner.query(`ALTER TABLE stock_symbols ALTER COLUMN exchange DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE stock_symbols ADD PRIMARY KEY (symbol)`)
  }
} 