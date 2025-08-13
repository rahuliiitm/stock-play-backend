import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HealthModule } from './health/health.module'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { ContestsModule } from './modules/contests/contests.module'
import { ParticipationModule } from './modules/participation/participation.module'
import { StocksModule } from './modules/stocks/stocks.module'
import { TradesModule } from './modules/trades/trades.module'
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { ScoringModule } from './modules/scoring/scoring.module'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.development'] }),
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				type: 'postgres',
				url: config.get<string>('DATABASE_URL'),
				autoLoadEntities: true,
				synchronize: false,
				migrations: [__dirname + '/migrations/*.{js,ts}'],
				migrationsRun: true,
			}),
		}),
		HealthModule,
		UsersModule,
		AuthModule,
		ContestsModule,
		ParticipationModule,
		StocksModule,
		TradesModule,
		LeaderboardModule,
		PaymentsModule,
		WebhooksModule,
		TasksModule,
		ScoringModule,
	],
	controllers: [AppController],
	providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
