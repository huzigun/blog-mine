import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './lib/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS for frontend (환경변수 기반)
  const corsOrigin = configService.corsOrigin;
  const allowedOrigins = corsOrigin.includes(',')
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : [corsOrigin];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Apply global validation pipe for automatic DTO validation and transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion for primitives
      },
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: false, // Don't throw error for extra properties
    }),
  );

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.port;
  const appName = configService.appName;

  await app.listen(port);

  console.log(`🚀 ${appName} is running on: http://localhost:${port}`);
  console.log(`📦 Environment: ${configService.appEnv}`);
}

void bootstrap();
