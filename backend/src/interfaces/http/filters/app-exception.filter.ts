import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../../domain/shared/domain-error';

const DOMAIN_STATUS: Record<string, number> = {
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  LOGIN_CONFLICT: HttpStatus.CONFLICT,
  ROUND_NOT_FOUND: HttpStatus.NOT_FOUND,
  ROUND_NOT_ACTIVE: HttpStatus.CONFLICT,
  INVALID_CURSOR: HttpStatus.BAD_REQUEST,
  FORBIDDEN: HttpStatus.FORBIDDEN,
};

const HTTP_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
};

const INTERNAL_BODY: ErrorBody = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'INTERNAL',
  message: 'Internal server error',
};

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const mapped = this.toBody(exception);
    if (mapped.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(INTERNAL_BODY);
      return;
    }
    res.status(mapped.statusCode).json(mapped);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof DomainError) {
      const statusCode = DOMAIN_STATUS[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      return { statusCode, code: exception.code, message: exception.message };
    }
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'object' && raw !== null && 'message' in raw
          ? (raw as { message: string | string[] }).message
          : exception.message;
      return { statusCode, code: HTTP_CODE[statusCode] ?? 'HTTP_ERROR', message };
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL', message: 'Internal server error' };
  }
}
