import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY } from '../../../domain/shared/tokens';
import { User } from '../../../domain/user/entities/user';
import { InvalidCredentialsError } from '../../../domain/user/errors/user.errors';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { GetMeQuery } from '../queries/get-me.query';

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery, User> {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(query: GetMeQuery): Promise<User> {
    const user = await this.users.findById(query.userId);
    if (!user) throw new InvalidCredentialsError();
    return user;
  }
}
