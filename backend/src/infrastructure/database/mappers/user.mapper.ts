import { User } from '../../../domain/user/entities/user';
import { UserOrmEntity } from '../entities/user.orm-entity';

export const UserMapper = {
  toDomain(entity: UserOrmEntity): User {
    return User.restore({
      id: entity.id,
      login: entity.login,
      passwordHash: entity.passwordHash,
      role: entity.role,
      createdAt: entity.createdAt,
    });
  },

  toOrm(user: User): UserOrmEntity {
    const entity = new UserOrmEntity();
    entity.id = user.id;
    entity.login = user.login;
    entity.passwordHash = user.passwordHash;
    entity.role = user.role;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.createdAt;
    return entity;
  },
};
