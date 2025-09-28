import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockSymbolsMetadata1710000003000 implements MigrationInterface {
  name = 'StockSymbolsMetadata1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS series varchar(16);`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS isin varchar(20);`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS lot_size integer;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS face_value numeric(10,2);`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS metadata jsonb;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_symbols ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: keep columns
  }
}
