import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/User.entity'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.register({})],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {} 