import { normalizeLogin } from './login-normalizer';

describe('normalizeLogin', () => {
  it.each([
    ['admin', 'admin'],
    ['  Admin  ', 'admin'],
    ['ADMIN', 'admin'],
    ['админ', 'admin'],
    ['Админ', 'admin'],
    ['Никита', 'nikita'],
    ['ниКиТа', 'nikita'],
    ['nikita', 'nikita'],
    ['NIKITA', 'nikita'],
    ['Никитa', 'nikita'],
    [' Никитa ', 'nikita'],
    ['Иван', 'ivan'],
    ['Ёжик', 'yozhik'],
    ['Щука', 'shchuka'],
    ['Объём', 'obyom'],
    ['nikita_2007', 'nikita_2007'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeLogin(input)).toBe(expected);
  });
});
