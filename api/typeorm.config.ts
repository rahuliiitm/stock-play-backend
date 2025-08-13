import 'dotenv/config'
import { DataSource } from 'typeorm'

const databaseUrl = process.env.DATABASE_URL || 'postgres://rjain@localhost:5432/stockplay'

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [__dirname + '/src/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/src/migrations/*.{ts,js}'],
  synchronize: false,
  logging: false,
}) 