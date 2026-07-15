import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from the React frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  // Prefix every route with /api — e.g. POST /api/auth/login
  app.setGlobalPrefix('api');

  // Validate and strip unknown fields from every request body
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown properties
      forbidNonWhitelisted: true, // throw if unknown properties are sent
      transform: true,           // auto-cast types (string → number, string → enum, etc.)
    }),
  );

  // Apply JWT guard to every route — use @Public() to opt out
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Catch all unhandled errors and return a consistent JSON shape
  app.useGlobalFilters(new AllExceptionsFilter());

  // Wrap every successful response in { data, timestamp }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger UI at /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TeamBoard API')
    .setDescription('Lightweight work management platform — API reference')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 TeamBoard API running on  http://localhost:${port}/api`);
  console.log(`📖 Swagger docs available at http://localhost:${port}/docs\n`);
}

bootstrap();
