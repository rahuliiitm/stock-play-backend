import * as nodeCrypto from 'crypto'
// Polyfill global crypto for Node < 20 before any other imports that may rely on it
;(globalThis as any).crypto = (globalThis as any).crypto || (nodeCrypto as any)

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
	app.use(helmet())
	app.enableCors({
		origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true
	})

	const config = new DocumentBuilder().setTitle('StockPlay API').setDescription('StockPlay Backend API').setVersion('1.0').addBearerAuth().build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('docs', app, document)

	await app.listen(process.env.PORT || 3001)
}
bootstrap()
