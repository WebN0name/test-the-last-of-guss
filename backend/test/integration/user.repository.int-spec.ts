import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { User } from '../../src/domain/user/entities/user';
import { UserRole } from '../../src/domain/user/value-objects/user-role';
import { LoginConflictError } from '../../src/domain/user/errors/user.errors';
import { TypeOrmUserRepository } from '../../src/infrastructure/database/repositories/typeorm-user.repository';
import { createTestDataSource, truncateAll } from './setup/test-db';

describe('TypeOrmUserRepository', () => {
  let ds: DataSource;
  let repo: TypeOrmUserRepository;
  const now = new Date();

  beforeAll(async () => {
    ds = await createTestDataSource();
    repo = new TypeOrmUserRepository(ds);
  });

  beforeEach(async () => {
    await truncateAll(ds);
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('insert + findByLogin возвращает того же пользователя с ролью', async () => {
    const user = User.create({ id: randomUUID(), login: 'Admin', passwordHash: 'hash', now });
    await repo.insert(user);
    const found = await repo.findByLogin('Admin');
    expect(found?.id).toBe(user.id);
    expect(found?.role).toBe(UserRole.Admin);
    expect(found?.passwordHash).toBe('hash');
  });

  it('логин чувствителен к регистру: Никита и никита — два пользователя', async () => {
    await repo.insert(User.create({ id: randomUUID(), login: 'Никита', passwordHash: 'h', now }));
    await repo.insert(User.create({ id: randomUUID(), login: 'никита', passwordHash: 'h', now }));
    expect(await repo.findByLogin('Никита')).not.toBeNull();
    expect(await repo.findByLogin('никита')).not.toBeNull();
    expect(await repo.findByLogin('НИКИТА')).toBeNull();
  });

  it('повторный insert с тем же логином бросает LoginConflictError', async () => {
    await repo.insert(User.create({ id: randomUUID(), login: 'dup', passwordHash: 'h', now }));
    await expect(
      repo.insert(User.create({ id: randomUUID(), login: 'dup', passwordHash: 'h2', now })),
    ).rejects.toBeInstanceOf(LoginConflictError);
  });

  it('findById возвращает null для неизвестного', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});
