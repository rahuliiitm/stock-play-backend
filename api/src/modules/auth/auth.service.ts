import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password)
  }

  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return argon2.verify(passwordHash, password)
  }

  issueTokens(userId: string, role: string = 'user') {
    const claims = { sub: userId, role }
    // Use module-configured default expiry for access token to avoid env misconfiguration
    const accessToken = this.jwt.sign(claims)
    const refreshTtl = process.env.JWT_REFRESH_TTL && process.env.JWT_REFRESH_TTL.trim().length > 0 ? process.env.JWT_REFRESH_TTL : '30d'
    const refreshToken = this.jwt.sign({ ...claims, typ: 'refresh' }, { expiresIn: refreshTtl })
    return { accessToken, refreshToken }
  }

  refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken)
      if (payload?.typ !== 'refresh') throw new UnauthorizedException('Invalid refresh')
      return this.issueTokens(payload.sub, payload.role || 'user')
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
} 