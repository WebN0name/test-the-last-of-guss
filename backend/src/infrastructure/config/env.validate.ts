import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Env } from './env';

const KNOWN_KEYS = new Set(Object.keys(new Env()).concat(['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']));

export function validateEnv(raw: Record<string, string | undefined>): Env {
  const picked: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (KNOWN_KEYS.has(key) && value !== undefined && value !== '') {
      picked[key] = value;
    }
  }

  const env = plainToInstance(Env, picked, { exposeDefaultValues: true });
  const errors = validateSync(env, { whitelist: true, forbidUnknownValues: false });

  const problems = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if (problems.length > 0) {
    throw new Error(`Invalid environment:\n  ${problems.join('\n  ')}`);
  }
  return env;
}
