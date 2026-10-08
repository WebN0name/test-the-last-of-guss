import { roleForLogin } from '../services/role-for-login';
import { UserRole } from '../value-objects/user-role';

export interface UserProps {
  id: string;
  login: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface CreateUserProps {
  id: string;
  login: string;
  passwordHash: string;
  now: Date;
}

export class User {
  readonly id: string;
  readonly login: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly createdAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.login = props.login;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.createdAt = props.createdAt;
  }

  static create(props: CreateUserProps): User {
    return new User({
      id: props.id,
      login: props.login,
      passwordHash: props.passwordHash,
      role: roleForLogin(props.login),
      createdAt: props.now,
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  isAdmin(): boolean {
    return this.role === UserRole.Admin;
  }

  isNikita(): boolean {
    return this.role === UserRole.Nikita;
  }
}
