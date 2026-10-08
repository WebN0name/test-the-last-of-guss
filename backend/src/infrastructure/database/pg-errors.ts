import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = (error as QueryFailedError & { driverError?: { code?: string } }).driverError;
  return driverError?.code === UNIQUE_VIOLATION;
}
