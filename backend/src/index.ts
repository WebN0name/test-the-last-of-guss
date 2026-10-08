import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_OPTIONS, configureApp } from './app.factory';
import { validateEnv } from './infrastructure/config/env.validate';
import { setupSwagger } from './interfaces/http/swagger/setup-swagger';

async function bootstrap(): Promise<void> {
  const { PORT } = validateEnv(process.env);
  const app = await NestFactory.create(AppModule, { ...APP_OPTIONS, abortOnError: false });
  configureApp(app);
  setupSwagger(app);
  app.enableShutdownHooks();
  await app.listen(PORT);
  Logger.log(`The Last of Guss API on http://localhost:${PORT}/api, docs at /api/docs`, 'Bootstrap');
}

async function run(): Promise<void> {
  try {
    await bootstrap();
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

void run();
