import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization

    // If no auth header, allow the request but don't set user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.user = null
      return true
    }

    // If auth header exists, try to validate JWT
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    try {
      const payload = this.jwtService.verify(token)
      request.user = payload
    } catch (error) {
      // Invalid token, but allow the request without user
      request.user = null
    }

    return true
  }
}

