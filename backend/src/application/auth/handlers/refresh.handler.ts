import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TOKEN_SERVICE, USER_REPOSITORY } from '../../../domain/shared/tokens';
import { InvalidCredentialsError } from '../../../domain/user/errors/user.errors';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { ITokenService } from '../../ports/token.port';
import { RefreshCommand } from '../commands/refresh.command';
import { AuthResult } from '../results/auth-result';

@CommandHandler(RefreshCommand)
export class RefreshHandler implements ICommandHandler<RefreshCommand, AuthResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: ITokenService,
  ) {}

  async execute(command: RefreshCommand): Promise<AuthResult> {
    const user = await this.users.findById(command.userId);
    if (!user) throw new InvalidCredentialsError();
    return { user, tokens: await this.tokens.signPair(user), created: false };
  }
}
