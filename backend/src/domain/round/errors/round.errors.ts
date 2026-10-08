import { DomainError } from '../../shared/domain-error';

export class RoundNotFoundError extends DomainError {
  readonly code = 'ROUND_NOT_FOUND';

  constructor(id: string) {
    super(`Round not found: ${id}`);
  }
}

export class RoundNotActiveError extends DomainError {
  readonly code = 'ROUND_NOT_ACTIVE';

  constructor(id: string) {
    super(`Round is not active: ${id}`);
  }
}

export class InvalidCursorError extends DomainError {
  readonly code = 'INVALID_CURSOR';

  constructor() {
    super('Invalid cursor');
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';

  constructor(action: string) {
    super(`Forbidden: ${action}`);
  }
}
