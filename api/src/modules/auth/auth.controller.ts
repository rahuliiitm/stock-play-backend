import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

class SignupDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsOptional()
  @IsString()
  displayName?: string | null
}
class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  password!: string
}
class RefreshDto {
  @IsNotEmpty()
  refreshToken!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() body: SignupDto) {
    return this.auth.signup(body)
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    return this.auth.login(body)
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken)
  }
} 