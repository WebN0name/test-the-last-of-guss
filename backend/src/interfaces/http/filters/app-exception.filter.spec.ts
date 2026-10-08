import { ArgumentsHost, BadGatewayException, Logger } from '@nestjs/common';
import { DomainError } from '../../../domain/shared/domain-error';
import { AppExceptionFilter } from './app-exception.filter';

class UnmappedError extends DomainError {
  readonly code = 'SECRET_INTERNAL_CODE';

  constructor() {
    super('secret detail');
  }
}

function run(exception: unknown): { status: number; body: unknown } {
  const captured = { status: 0, body: undefined as unknown };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new AppExceptionFilter().catch(exception, host);
  return { status: captured.status, body: captured.body };
}

describe('AppExceptionFilter', () => {
  const internal = { statusCode: 500, code: 'INTERNAL', message: 'Internal server error' };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('неотмапленная DomainError → 500 INTERNAL без деталей, stack в логе', () => {
    const result = run(new UnmappedError());
    expect(result.status).toBe(500);
    expect(result.body).toEqual(internal);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('HttpException 5xx → 500 INTERNAL без деталей', () => {
    const result = run(new BadGatewayException('upstream secret'));
    expect(result.status).toBe(500);
    expect(result.body).toEqual(internal);
  });

  it('произвольная ошибка → 500 INTERNAL', () => {
    expect(run(new Error('boom')).body).toEqual(internal);
  });
});
