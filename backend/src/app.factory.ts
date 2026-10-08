import { HttpStatus, INestApplication, NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, NextFunction, Request, Response } from 'express';
import { AppExceptionFilter } from './interfaces/http/filters/app-exception.filter';

export const APP_OPTIONS: NestApplicationOptions = { bodyParser: false };

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const JSON_CONTENT_TYPE = /^application\/json\s*(;|$)/i;

function requireJsonContentType(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'];
  if (MUTATING_METHODS.has(req.method) && contentType && !JSON_CONTENT_TYPE.test(contentType)) {
    res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({
      statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Content-Type must be application/json',
    });
    return;
  }
  next();
}

interface BodyParserError {
  type?: string;
  status?: number;
  expose?: boolean;
}

function handleBodyParserError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  const error: BodyParserError = typeof err === 'object' && err !== null ? err : {};
  if (error.type === 'entity.parse.failed') {
    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: ['Malformed JSON body'],
    });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      code: 'PAYLOAD_TOO_LARGE',
      message: ['Request body too large'],
    });
    return;
  }
  if (error.expose === true && typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
    const unsupported = error.status === Number(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    res.status(error.status).json({
      statusCode: error.status,
      code: unsupported ? 'UNSUPPORTED_MEDIA_TYPE' : 'BAD_REQUEST',
      message: [unsupported ? 'Unsupported request body' : 'Bad request body'],
    });
    return;
  }
  next(err);
}

export function configureApp(app: INestApplication): void {
  app.use(requireJsonContentType);
  app.use(json());
  app.use(handleBodyParserError);
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, stopAtFirstError: false }));
  app.useGlobalFilters(new AppExceptionFilter());
}
