import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { APP_OPTIONS, configureApp } from '../../../app.factory';
import { buildOpenApiDocument } from './setup-swagger';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { ...APP_OPTIONS, logger: false, abortOnError: false });
  configureApp(app);
  await app.init();
  const document = buildOpenApiDocument(app);
  const target = path.resolve(process.cwd(), 'swagger.json');
  writeFileSync(target, JSON.stringify(document, null, 2) + '\n', 'utf8');
  await app.close();
  process.stdout.write(`swagger.json written to ${target}\n`);
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  }
}

void run();
