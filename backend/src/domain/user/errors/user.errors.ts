import { DomainError } from '../../shared/domain-error';

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid password');
  }
}

export class LoginConflictError extends DomainError {
  readonly code = 'LOGIN_CONFLICT';

  constructor(login: string) {
    super(`Login already exists: ${login}`);
  }
}
