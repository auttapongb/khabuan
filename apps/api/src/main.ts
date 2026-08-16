import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import cookie from '@fastify/cookie';
import fastifyRawBody from 'fastify-raw-body';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  await app.register(cookie as never, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  });

  // Capture the exact raw bytes so LINE webhook signature verification works
  // against the original payload (not a JSON re-serialization).
  await app.register(fastifyRawBody as never, {
    field: 'rawBody',
    global: true,
    encoding: 'utf8',
    runFirst: true,
  });

  const origins = [
    'http://localhost:3000',
    process.env.WEB_ORIGIN,
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);

  app.enableCors({
    origin: [...new Set(origins)],
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle('MCG Convoy API')
    .setDescription(
      'LINE LIFF + web API for luxury car group trips. Demo auth: POST /v1/auth/line/exchange with idToken "demo".',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  const logger = new Logger('Bootstrap');
  logger.log(`MCG Convoy API listening on http://${host}:${port}`);
  logger.log(`OpenAPI docs: http://localhost:${port}/docs`);
  logger.log(
    `Auth mode=${process.env.AUTH_MODE ?? 'demo'} persistence=${process.env.PERSISTENCE_MODE ?? 'memory'}`,
  );
}

void bootstrap();
