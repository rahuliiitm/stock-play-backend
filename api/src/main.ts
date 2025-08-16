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
	app.enableCors()

	const config = new DocumentBuilder().setTitle('StockPlay API').setDescription('StockPlay Backend API').setVersion('1.0').addBearerAuth().build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('docs', app, document)

	await app.listen(process.env.PORT || 3000)
}
bootstrap()
