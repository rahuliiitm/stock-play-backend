import { MigrationInterface, QueryRunner } from 'typeorm'

export class StockPriceHistory1710000002800 implements MigrationInterface {
  name = 'StockPriceHistory1710000002800'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_price_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol text NOT NULL,
        as_of timestamptz NOT NULL,
        ltp double precision NOT NULL,
        volume bigint NULL
      );
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_sph_symbol_asof ON stock_price_history(symbol, as_of);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock_price_history;`)
  }
} 