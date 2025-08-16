import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'
import { UsersService } from './users.service'
import { AuthService } from '../auth/auth.service'

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

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() body: SignupDto) {
    const existing = await this.users.findByEmail(body.email)
    if (existing) throw new Error('Email already in use')
    const password_hash = await this.auth.hashPassword(body.password)
    const user = await this.users.createUser({ email: body.email, password_hash, display_name: body.displayName ?? null })
    return this.auth.issueTokens(user.id, user.role)
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    const user = await this.users.findByEmail(body.email)
    if (!user) throw new Error('Invalid credentials')
    const ok = await this.auth.verifyPassword(user.password_hash, body.password)
    if (!ok) throw new Error('Invalid credentials')
    return this.auth.issueTokens(user.id, user.role)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { id: req.user.sub }
  }
} 