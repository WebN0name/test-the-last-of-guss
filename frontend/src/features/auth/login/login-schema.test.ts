import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('принимает валидные данные', () => {
    expect(loginSchema.safeParse({ login: 'Иван', password: 'secret-1' }).success).toBe(true);
  });

  it.each([
    [{ login: 'ab', password: 'secret-1' }, 'login'],
    [{ login: ' Иван', password: 'secret-1' }, 'login'],
    [{ login: 'Иван ', password: 'secret-1' }, 'login'],
    [{ login: 'x'.repeat(33), password: 'secret-1' }, 'login'],
    [{ login: 'Ив\u0000ан', password: 'secret-1' }, 'login'],
    [{ login: 'Ив​ан', password: 'secret-1' }, 'login'],
    [{ login: 'Иван', password: 'short' }, 'password'],
    [{ login: 'Иван', password: 'я'.repeat(40) }, 'password'],
  ])('отклоняет %o по полю %s', (input, field) => {
    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path[0]).toBe(field);
  });
});
