import { isApiError } from './errors';

export type ErrorContext = 'login' | 'tap' | 'round';

const TAP_REJECTED = 'Тапы не приняты: сервер отклонил запрос. Обнови страницу.';
const ROUND_REJECTED = 'Раунд не создан: сервер отклонил запрос. Обнови страницу.';

const CONTEXT_TEXT: Record<ErrorContext, Record<string, string>> = {
  login: {
    VALIDATION_ERROR: 'Проверь имя и пароль.',
    BAD_REQUEST: 'Запрос не принят. Проверь имя и пароль.',
    PAYLOAD_TOO_LARGE: 'Слишком длинные данные. Сократи имя или пароль.',
  },
  tap: { VALIDATION_ERROR: TAP_REJECTED, BAD_REQUEST: TAP_REJECTED, PAYLOAD_TOO_LARGE: TAP_REJECTED },
  round: { VALIDATION_ERROR: ROUND_REJECTED, BAD_REQUEST: ROUND_REJECTED, PAYLOAD_TOO_LARGE: ROUND_REJECTED },
};

const ERROR_TEXT: Record<string, string> = {
  UNSUPPORTED_MEDIA_TYPE: 'Запрос не принят. Обнови страницу и попробуй ещё раз.',
  ROUND_NOT_ACTIVE: 'Тапы не засчитаны: раунд не активен или слишком частые тапы.',
  FORBIDDEN: 'Недостаточно прав для этого действия.',
  INTERNAL: 'Что-то пошло не так на сервере. Попробуй чуть позже.',
  HTTP_ERROR: 'Сервер временно недоступен. Попробуй чуть позже.',
};

interface ErrorTextOptions {
  context: ErrorContext;
  login?: string;
  fallback?: string;
}

export function errorText(error: unknown, options: ErrorTextOptions): string {
  if (!isApiError(error)) return 'Сеть недоступна. Попробуй ещё раз.';
  if (error.code === 'INVALID_CREDENTIALS') {
    return `Неверный пароль. Имя «${options.login ?? ''}» уже занято — если это не ты, возьми другое.`;
  }
  return (
    CONTEXT_TEXT[options.context][error.code] ??
    ERROR_TEXT[error.code] ??
    options.fallback ??
    'Что-то пошло не так. Попробуй ещё раз.'
  );
}
