import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, registerDecorator, ValidationOptions } from 'class-validator';
import { UserRole } from '../../../domain/user/value-objects/user-role';

export function MaxBytes(max: number, options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      name: 'maxBytes',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: { message: `${String(propertyKey)} must be at most ${max} bytes`, ...options },
      validator: { validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max },
    });
  };
}

export class LoginDto {
  @ApiProperty({ example: 'Иван', minLength: 3, maxLength: 32 })
  @IsString()
  @Length(3, 32)
  @Matches(/^\S(.*\S)?$/u, { message: 'login must not start or end with whitespace' })
  @Matches(/^[^\p{Cc}\p{Cf}\p{Cs}]*$/u, { message: 'login must not contain control or invisible characters' })
  login!: string;

  @ApiProperty({ example: 'secret-1', minLength: 6 })
  @IsString()
  @Length(6, 72)
  @MaxBytes(72)
  password!: string;
}

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Иван' })
  login!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;

  @ApiProperty({ description: 'true, если пользователь был создан этим запросом' })
  created!: boolean;
}

export class MeResponseDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;
}
