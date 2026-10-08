import { User } from '../../../domain/user/entities/user';
import { UserDto } from '../dto/auth.dto';

export function toUserDto(user: User): UserDto {
  return { id: user.id, login: user.login, role: user.role };
}
