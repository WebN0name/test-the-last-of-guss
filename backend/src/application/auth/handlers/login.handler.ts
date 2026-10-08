import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IClock } from '../../../domain/shared/clock';
import { CLOCK, PASSWORD_HASHER, TOKEN_SERVICE, USER_REPOSITORY } from '../../../domain/shared/tokens';
import { User } from '../../../domain/user/entities/user';
import { InvalidCredentialsError, LoginConflictError } from '../../../domain/user/errors/user.errors';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { IPasswordHasher } from '../../ports/password-hasher.port';
import { ITokenService } from '../../ports/token.port';
import { LoginCommand } from '../commands/login.command';
import { AuthResult } from '../results/auth-result';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: ITokenService,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResult> {
    const existing = await this.users.findByLogin(command.login);
    if (existing) return this.signIn(existing, command.password);

    const user = User.create({
      id: randomUUID(),
      login: command.login,
      passwordHash: await this.hasher.hash(command.password),
      now: this.clock.now(),
    });

    try {
      await this.users.insert(user);
    } catch (error) {
      if (!(error instanceof LoginConflictError)) throw error;
      const winner = await this.users.findByLogin(command.login);
      if (!winner) throw error;
      return this.signIn(winner, command.password);
    }

    return { user, tokens: await this.tokens.signPair(user), created: true };
  }

  private async signIn(user: User, password: string): Promise<AuthResult> {
    const ok = await this.hasher.compare(password, user.passwordHash);
    if (!ok) throw new InvalidCredentialsError();
    return { user, tokens: await this.tokens.signPair(user), created: false };
  }
}
