import { User } from '../../../domain/user/entities/user';
import { InvalidCredentialsError } from '../../../domain/user/errors/user.errors';
import { FakeUserRepository } from '../../../test-support/fakes/fake-user.repository';
import { GetMeQuery } from '../queries/get-me.query';
import { GetMeHandler } from './get-me.handler';

describe('GetMeHandler', () => {
  it('возвращает пользователя', async () => {
    const users = new FakeUserRepository();
    await users.insert(User.create({ id: 'u1', login: 'Иван', passwordHash: 'h', now: new Date() }));
    expect((await new GetMeHandler(users).execute(new GetMeQuery('u1'))).login).toBe('Иван');
  });

  it('неизвестный → InvalidCredentialsError', async () => {
    await expect(new GetMeHandler(new FakeUserRepository()).execute(new GetMeQuery('x'))).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });
});
