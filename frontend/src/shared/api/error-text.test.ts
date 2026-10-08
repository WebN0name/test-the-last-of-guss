import { describe, expect, it } from 'vitest';
import { errorText } from './error-text';
import { ApiError } from './errors';

const validation = new ApiError(400, 'VALIDATION_ERROR', 'count must not be greater than 20');

describe('errorText', () => {
  it('VALIDATION_ERROR при входе — про имя и пароль', () => {
    expect(errorText(validation, { context: 'login' })).toBe('Проверь имя и пароль.');
  });

  it('VALIDATION_ERROR тапа — без упоминания имени и пароля', () => {
    expect(errorText(validation, { context: 'tap' })).toBe('Тапы не приняты: сервер отклонил запрос. Обнови страницу.');
  });

  it('VALIDATION_ERROR создания раунда — про раунд', () => {
    expect(errorText(validation, { context: 'round' })).toBe(
      'Раунд не создан: сервер отклонил запрос. Обнови страницу.',
    );
  });

  it('BAD_REQUEST и PAYLOAD_TOO_LARGE вне входа не говорят про имя', () => {
    for (const code of ['BAD_REQUEST', 'PAYLOAD_TOO_LARGE']) {
      expect(errorText(new ApiError(400, code, 'x'), { context: 'tap' })).not.toMatch(/имя/);
      expect(errorText(new ApiError(400, code, 'x'), { context: 'round' })).not.toMatch(/имя/);
    }
  });

  it('общие коды одинаковы во всех контекстах', () => {
    const error = new ApiError(409, 'ROUND_NOT_ACTIVE', 'x');
    expect(errorText(error, { context: 'tap' })).toBe('Тапы не засчитаны: раунд не активен или слишком частые тапы.');
    expect(errorText(new ApiError(403, 'FORBIDDEN', 'x'), { context: 'round' })).toBe(
      'Недостаточно прав для этого действия.',
    );
  });

  it('неверный пароль подставляет имя', () => {
    expect(errorText(new ApiError(401, 'INVALID_CREDENTIALS', 'x'), { context: 'login', login: 'Иван' })).toBe(
      'Неверный пароль. Имя «Иван» уже занято — если это не ты, возьми другое.',
    );
  });

  it('не ApiError — сеть, неизвестный код — fallback', () => {
    expect(errorText(new TypeError('network'), { context: 'tap' })).toBe('Сеть недоступна. Попробуй ещё раз.');
    expect(
      errorText(new ApiError(418, 'TEAPOT', 'x'), { context: 'round', fallback: 'Не удалось создать раунд' }),
    ).toBe('Не удалось создать раунд');
  });
});
