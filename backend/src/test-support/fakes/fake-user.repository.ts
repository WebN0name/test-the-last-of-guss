import { User } from '../../domain/user/entities/user';
import { LoginConflictError } from '../../domain/user/errors/user.errors';
import { IUserRepository } from '../../domain/user/repositories/user.repository.interface';

export class FakeUserRepository implements IUserRepository {
  readonly byLogin = new Map<string, User>();
  conflictOnNextInsert: User | null = null;

  async findById(id: string): Promise<User | null> {
    return [...this.byLogin.values()].find((u) => u.id === id) ?? null;
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.byLogin.get(login) ?? null;
  }

  async insert(user: User): Promise<void> {
    if (this.conflictOnNextInsert) {
      const winner = this.conflictOnNextInsert;
      this.conflictOnNextInsert = null;
      this.byLogin.set(winner.login, winner);
      throw new LoginConflictError(user.login);
    }
    if (this.byLogin.has(user.login)) throw new LoginConflictError(user.login);
    this.byLogin.set(user.login, user);
  }
}
