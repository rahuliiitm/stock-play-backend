import * as nodeCrypto from 'crypto'
// Polyfill global crypto for Node < 20 before any other imports that may rely on it
;(globalThis as any).crypto = (globalThis as any).crypto || (nodeCrypto as any)

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { DataSource } from 'typeorm'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.use(helmet())
	app.enableCors({ origin: true, credentials: true })
	app.useGlobalPipes(
		new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }),
	)

	// Ensure DB migrations are applied (safe if already applied)
	try {
		const dataSource = app.get(DataSource)
		await dataSource.runMigrations()
	} catch (e) {
		// continue startup even if migrations runner is not configured
	}

	await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
