import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { IsNotEmpty } from 'class-validator'

class RefreshDto {
  @IsNotEmpty()
  refreshToken!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken)
  }
} 