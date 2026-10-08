import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../../../domain/user/entities/user';
import { LoginConflictError } from '../../../domain/user/errors/user.errors';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';
import { isUniqueViolation } from '../pg-errors';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserOrmEntity).findOne({ where: { id } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByLogin(login: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserOrmEntity).findOne({ where: { login } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async insert(user: User): Promise<void> {
    try {
      await this.dataSource.getRepository(UserOrmEntity).insert(UserMapper.toOrm(user));
    } catch (error) {
      if (isUniqueViolation(error)) throw new LoginConflictError(user.login);
      throw error;
    }
  }
}
