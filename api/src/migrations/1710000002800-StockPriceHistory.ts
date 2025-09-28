import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockPriceHistory1710000002800 implements MigrationInterface {
  name = 'StockPriceHistory1710000002800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('stock_price_history');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE stock_price_history (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text NOT NULL,
          as_of timestamptz NOT NULL,
          ltp double precision NOT NULL,
          volume bigint NULL
        );
      `);
      await queryRunner.query(
        `CREATE UNIQUE INDEX ux_sph_symbol_asof ON stock_price_history(symbol, as_of);`,
      );
    } else {
      // Table exists, check if it has the expected columns
      const columns = await queryRunner.getTable('stock_price_history');
      const hasAsOfColumn = columns?.columns.some(
        (col) => col.name === 'as_of',
      );

      if (!hasAsOfColumn) {
        console.log(
          'Stock price history table exists with different schema, skipping migration',
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock_price_history;`);
  }
}
