import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { authenticator } from 'otplib'

function getEnv(name: string, fallback?: string) {
  return process.env[name] ?? fallback ?? ''
}

function getByPath(obj: any, path: string): any {
  try {
    return path.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj)
  } catch {
    return undefined
  }
}

@Injectable()
export class GrowwAuthService {
  private readonly logger = new Logger(GrowwAuthService.name)
  private cachedToken: string | null = null
  private cachedUntil = 0

  constructor(private readonly http: HttpService) {}

  private baseUrl() {
    return getEnv('GROWW_API_BASE', 'https://api.groww.in')
  }

  private headers() {
    return { Accept: 'application/json', 'X-API-VERSION': '1.0' }
  }

  private totpSecret() {
    return getEnv('GROWW_API_SECRET')
  }

  private apiKey() {
    return getEnv('GROWW_API_KEY')
  }

  private totpUrl() {
    return getEnv('GROWW_TOTP_URL', `${this.baseUrl()}/v1/auth/totp/login`)
  }

  private tokenJsonPath() {
    return getEnv('GROWW_TOKEN_JSON_PATH', 'payload.access_token')
  }

  private ttlMs() {
    // Default: 50 seconds TTL so we refresh roughly every minute window
    const v = Number(getEnv('GROWW_TOKEN_TTL_MS', '50000'))
    return Number.isFinite(v) && v > 0 ? v : 50000
  }

  private generateTotp(): string {
    const secret = this.totpSecret()
    if (!secret) throw new Error('GROWW_API_SECRET is not set')
    return authenticator.generate(secret)
  }

  async getAccessToken(): Promise<string> {
    // Prefer explicit access token if provided via env
    const envToken = getEnv('GROWW_ACCESS_TOKEN')
    if (envToken) return envToken

    const now = Date.now()
    if (this.cachedToken && now < this.cachedUntil) {
      return this.cachedToken
    }

    const otp = this.generateTotp()
    const payloadKey = getEnv('GROWW_TOTP_PAYLOAD_KEY', 'apiKey')
    const otpKey = getEnv('GROWW_TOTP_OTP_KEY', 'otp')

    const body: Record<string, any> = {}
    body[payloadKey] = this.apiKey()
    body[otpKey] = otp

    const url = this.totpUrl()
    const { data } = await this.http.axiosRef.post(url, body, { headers: this.headers() })
    const token = getByPath(data, this.tokenJsonPath()) || data?.access_token
    if (!token) {
      this.logger.error(`Groww TOTP response did not include access token. Configure GROWW_TOKEN_JSON_PATH or verify endpoint.`)
      throw new Error('Groww access token not found in response')
    }
    this.cachedToken = token
    this.cachedUntil = now + this.ttlMs()
    return token
  }
} 