import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // App Configuration
  get appName(): string {
    return this.configService.get<string>('app.name', 'blog-mine-backend');
  }

  get appVersion(): string {
    return this.configService.get<string>('app.version', '0.0.1');
  }

  get appEnv(): string {
    return this.configService.get<string>('app.env', 'development');
  }

  get isDevelopment(): boolean {
    return this.appEnv === 'development';
  }

  get isProduction(): boolean {
    return this.appEnv === 'production';
  }

  // Server Configuration
  get port(): number {
    return this.configService.get<number>('server.port', 3000);
  }

  // Database Configuration
  get dbHost(): string {
    return this.configService.get<string>('database.host', 'localhost');
  }

  get dbPort(): number {
    return this.configService.get<number>('database.port', 5432);
  }

  get dbUsername(): string | undefined {
    return this.configService.get<string>('database.username');
  }

  get dbPassword(): string | undefined {
    return this.configService.get<string>('database.password');
  }

  get dbDatabase(): string | undefined {
    return this.configService.get<string>('database.database');
  }

  get dbSynchronize(): boolean {
    return this.configService.get<boolean>('database.synchronize', false);
  }

  get dbLogging(): boolean {
    return this.configService.get<boolean>('database.logging', false);
  }

  get dbSsl(): boolean {
    return this.configService.get<boolean>('database.ssl', false);
  }

  // JWT Configuration
  get jwtSecret(): string {
    return (
      this.configService.get<string>('jwt.secret') ||
      'default-secret-change-in-production'
    );
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('jwt.expiresIn', '1d');
  }

  // CORS Configuration
  get corsOrigin(): string {
    return this.configService.get<string>('cors.origin', '*');
  }

  // Logging Configuration
  get logLevel(): string {
    return this.configService.get<string>('logging.level', 'info');
  }

  // Swagger Configuration
  get swaggerEnabled(): boolean {
    return this.configService.get<boolean>('swagger.enabled', false);
  }

  // Rate Limit Configuration
  get rateLimitTtl(): number {
    return this.configService.get<number>('rateLimit.ttl', 60);
  }

  get rateLimitMax(): number {
    return this.configService.get<number>('rateLimit.max', 100);
  }

  // Seed User Configuration
  get seedUserEmail(): string | undefined {
    return this.configService.get<string>('seedUser.email');
  }

  get seedUserName(): string | undefined {
    return this.configService.get<string>('seedUser.name');
  }

  get seedUserPassword(): string | undefined {
    return this.configService.get<string>('seedUser.password');
  }

  // Generic getter for custom config values
  get<T = any>(key: string): T | undefined {
    return this.configService.get<T>(key);
  }

  getOrThrow<T = any>(key: string): T {
    return this.configService.getOrThrow<T>(key);
  }

  // Naver Configuration
  get naverClientId(): string | undefined {
    return this.configService.get<string>('naver.clientId');
  }

  get naverClientSecret(): string | undefined {
    return this.configService.get<string>('naver.clientSecret');
  }

  // Kakao Configuration
  get kakaoClientId(): string | undefined {
    return this.configService.get<string>('kakao.clientId');
  }

  get kakaoClientSecret(): string | undefined {
    return this.configService.get<string>('kakao.clientSecret');
  }

  get kakaoRedirectUri(): string | undefined {
    return this.configService.get<string>('kakao.redirectUri');
  }

  get kakaoAdminKey(): string | undefined {
    return this.configService.get<string>('kakao.adminKey');
  }
}
