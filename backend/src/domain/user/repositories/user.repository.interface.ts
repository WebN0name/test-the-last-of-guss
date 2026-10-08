import { User } from '../entities/user';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByLogin(login: string): Promise<User | null>;
  insert(user: User): Promise<void>;
}
