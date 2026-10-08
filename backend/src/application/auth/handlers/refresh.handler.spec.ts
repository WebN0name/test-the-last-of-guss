import { User } from '../../../domain/user/entities/user';
import { InvalidCredentialsError } from '../../../domain/user/errors/user.errors';
import { FakeTokenService } from '../../../test-support/fakes/fake-token.service';
import { FakeUserRepository } from '../../../test-support/fakes/fake-user.repository';
import { RefreshCommand } from '../commands/refresh.command';
import { RefreshHandler } from './refresh.handler';

describe('RefreshHandler', () => {
  it('выдаёт новую пару существующему пользователю', async () => {
    const users = new FakeUserRepository();
    const tokens = new FakeTokenService();
    const user = User.create({ id: 'u1', login: 'Иван', passwordHash: 'h', now: new Date() });
    await users.insert(user);
    const result = await new RefreshHandler(users, tokens).execute(new RefreshCommand('u1'));
    expect(result.user.id).toBe('u1');
    expect(result.created).toBe(false);
    expect(tokens.issued).toHaveLength(1);
  });

  it('неизвестный userId → InvalidCredentialsError', async () => {
    await expect(
      new RefreshHandler(new FakeUserRepository(), new FakeTokenService()).execute(new RefreshCommand('ghost')),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
