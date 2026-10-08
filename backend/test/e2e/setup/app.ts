import { config } from 'dotenv';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Response } from 'supertest';
import { AppModule } from '../../../src/app.module';
import { APP_OPTIONS, configureApp } from '../../../src/app.factory';

config({ path: '.env.test', override: true, quiet: true });

export interface E2eContext {
  app: INestApplication;
  ds: DataSource;
}

export async function createE2eApp(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication(APP_OPTIONS);
  configureApp(app);
  await app.init();
  const ds = app.get(DataSource);
  await ds.runMigrations();
  return { app, ds };
}

export async function resetDb(ds: DataSource): Promise<void> {
  await ds.query('TRUNCATE TABLE scores, rounds, users CASCADE');
}

export function cookiesOf(res: Response): Record<string, string> {
  const header: string | string[] | undefined = res.headers['set-cookie'];
  const list: string[] = Array.isArray(header) ? header : header ? [header] : [];
  const out: Record<string, string> = {};
  for (const raw of list) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function waitForRoundStart(ds: DataSource, roundId: string, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const rows: { started: boolean }[] = await ds.query(
      'SELECT now() >= start_at AS started FROM rounds WHERE id = $1',
      [roundId],
    );
    if (rows[0]?.started) return;
    if (Date.now() >= deadline) throw new Error(`round ${roundId} did not start in DB within ${timeoutMs} ms`);
    await sleep(50);
  }
}
