import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.port;
  const appName = configService.appName;

  await app.listen(port);

  console.log(`🚀 ${appName} is running on: http://localhost:${port}`);
  console.log(`📦 Environment: ${configService.appEnv}`);
}

void bootstrap();
