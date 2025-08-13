import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import * as argon2 from 'argon2'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async signup(input: { email: string; password: string; displayName?: string | null }) {
    const existing = await this.users.findByEmail(input.email)
    if (existing) throw new BadRequestException('Email already in use')
    const password_hash = await argon2.hash(input.password)
    const user = await this.users.createUser({ email: input.email, password_hash, display_name: input.displayName ?? null })
    return this.issueTokens(user.id)
  }

  async login(input: { email: string; password: string }) {
    const user = await this.users.findByEmail(input.email)
    if (!user) throw new UnauthorizedException('Invalid credentials')
    const ok = await argon2.verify(user.password_hash, input.password)
    if (!ok) throw new UnauthorizedException('Invalid credentials')
    return this.issueTokens(user.id)
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_SECRET || 'devsecret' })
      if (payload?.typ !== 'refresh') throw new UnauthorizedException('Invalid refresh')
      return this.issueTokens(payload.sub)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  private async issueTokens(userId: string) {
    const user = await this.users.findById(userId)
    const claims = { sub: userId, role: user?.role ?? 'user' }
    const accessToken = this.jwt.sign(claims, { expiresIn: process.env.JWT_ACCESS_TTL || '900s', secret: process.env.JWT_SECRET || 'devsecret' })
    const refreshToken = this.jwt.sign({ ...claims, typ: 'refresh' }, { expiresIn: process.env.JWT_REFRESH_TTL || '2592000s', secret: process.env.JWT_SECRET || 'devsecret' })
    return { accessToken, refreshToken }
  }
} 