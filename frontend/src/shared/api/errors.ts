export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isErrorBody(value: unknown): value is { statusCode: number; code: string; message: string | string[] } {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  const message = body.message;
  const messageOk =
    typeof message === 'string' || (Array.isArray(message) && message.every((m) => typeof m === 'string'));
  return typeof body.statusCode === 'number' && typeof body.code === 'string' && messageOk;
}
