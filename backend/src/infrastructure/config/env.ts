import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Matches, Max, Min, MinLength } from 'class-validator';

const toInt = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : value;

const toBool = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class Env {
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  JWT_ACCESS_TTL: number = 900;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL: number = 604800;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  ROUND_DURATION: number = 60;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  COOLDOWN_DURATION: number = 30;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  TAP_GRACE_SECONDS: number = 2;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(20)
  TAP_BATCH_MAX: number = 20;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  MAX_TPS: number = 20;

  @Transform(toBool)
  @IsBoolean()
  COOKIE_SECURE: boolean = true;
}
