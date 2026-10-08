import { Column, Entity, PrimaryColumn } from 'typeorm';
import { UserRole } from '../../../domain/user/value-objects/user-role';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'text', unique: true })
  login!: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role' })
  role!: UserRole;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
