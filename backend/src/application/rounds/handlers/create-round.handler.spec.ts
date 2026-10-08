import { ForbiddenError } from '../../../domain/round/errors/round.errors';
import { User } from '../../../domain/user/entities/user';
import { FakeGameConfig } from '../../../test-support/fakes/fake-game-config';
import { FakeRoundRepository } from '../../../test-support/fakes/fake-round.repository';
import { FakeUserRepository } from '../../../test-support/fakes/fake-user.repository';
import { FixedClock } from '../../../test-support/fakes/fixed-clock';
import { CreateRoundCommand } from '../commands/create-round.command';
import { CreateRoundHandler } from './create-round.handler';

describe('CreateRoundHandler', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  let users: FakeUserRepository;
  let rounds: FakeRoundRepository;
  let handler: CreateRoundHandler;

  beforeEach(async () => {
    users = new FakeUserRepository();
    rounds = new FakeRoundRepository();
    handler = new CreateRoundHandler(rounds, users, new FixedClock(now), new FakeGameConfig());
    await users.insert(User.create({ id: 'a1', login: 'Admin', passwordHash: 'h', now }));
    await users.insert(User.create({ id: 's1', login: 'Иван', passwordHash: 'h', now }));
  });

  it('admin создаёт раунд с датами из конфига и получает view с логином', async () => {
    const view = await handler.execute(new CreateRoundCommand('a1'));
    expect(view.creatorLogin).toBe('Admin');
    expect(view.round.startAt).toEqual(new Date(now.getTime() + 30_000));
    expect(view.round.endAt).toEqual(new Date(now.getTime() + 90_000));
    expect(rounds.rounds.size).toBe(1);
  });

  it('survivor → ForbiddenError, раунд не создан', async () => {
    await expect(handler.execute(new CreateRoundCommand('s1'))).rejects.toBeInstanceOf(ForbiddenError);
    expect(rounds.rounds.size).toBe(0);
  });

  it('неизвестный пользователь → ForbiddenError', async () => {
    await expect(handler.execute(new CreateRoundCommand('ghost'))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
