import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: isProduction
        ? { level: 'warn' }
        : { level: 'info', transport: { target: 'pino-pretty' } },
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3330);
  const prefix = config.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigins = config.get<string>('app.corsOrigins', '*');

  app.setGlobalPrefix(prefix, {
    exclude: ['/uploads/*path'],
  });

  // ── Helmet ──────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: isProduction ? undefined : false,
  });

  // ── Multipart (file uploads) ────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // ── Static files (serve uploads) ────────────────────────
  const uploadDir = config.get<string>('UPLOAD_DIR', './uploads');
  const uploadsRoot = path.isAbsolute(uploadDir)
    ? uploadDir
    : path.join(process.cwd(), uploadDir);
  await app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ── CORS ────────────────────────────────────────────────
  const allowedOrigins = corsOrigins === '*'
    ? true
    : corsOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: isProduction ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  });

  // ── Global pipes / filters / interceptors ───────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger (non-production only) ──────────────────────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pokerank API')
      .setDescription('Pokémon GO companion analytics backend')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        'Bearer',
      )
      .addServer(`http://localhost:${port}`, 'Local Development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // ── Start ───────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`NODE_ENV        : ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`Server          : http://localhost:${port}`);
  logger.log(`API Prefix      : /${prefix}`);
  logger.log(`CORS Origins    : ${isProduction ? corsOrigins : '* (dev mode — all origins)'}`);
  if (!isProduction) {
    logger.log(`Swagger Docs    : http://localhost:${port}/${prefix}/docs`);
  }
}

void bootstrap();
