import { validateEnv } from './env.validate';

const valid = {
  PORT: '3000',
  DATABASE_URL: 'postgresql://guss:guss@localhost:5432/guss',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ACCESS_TTL: '900',
  JWT_REFRESH_TTL: '604800',
  ROUND_DURATION: '60',
  COOLDOWN_DURATION: '30',
  TAP_GRACE_SECONDS: '2',
  TAP_BATCH_MAX: '20',
  MAX_TPS: '20',
  COOKIE_SECURE: 'false',
};

describe('validateEnv', () => {
  it('парсит числа и булевы из строк', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.ROUND_DURATION).toBe(60);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('подставляет значения по умолчанию для пропущенных необязательных', () => {
    const { PORT: _p, TAP_GRACE_SECONDS: _g, COOKIE_SECURE: _c, ...rest } = valid;
    const env = validateEnv(rest);
    expect(env.PORT).toBe(3000);
    expect(env.TAP_GRACE_SECONDS).toBe(2);
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('падает без DATABASE_URL с понятным сообщением', () => {
    const { DATABASE_URL: _d, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('падает на коротком секрете', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('падает, если секреты совпадают', () => {
    expect(() => validateEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(/differ/);
  });

  it('падает на нечисловом ROUND_DURATION', () => {
    expect(() => validateEnv({ ...valid, ROUND_DURATION: 'minute' })).toThrow(/ROUND_DURATION/);
  });

  it('игнорирует посторонние переменные', () => {
    expect(() => validateEnv({ ...valid, PATH: '/usr/bin' })).not.toThrow();
  });
});
