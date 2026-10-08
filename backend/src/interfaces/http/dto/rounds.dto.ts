import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RoundScope } from '../../../domain/round/value-objects/round-page';
import { RoundStatus } from '../../../domain/round/value-objects/round-status';

export const TAP_COUNT_MAX = 20;

export class TapDto {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: TAP_COUNT_MAX, example: 1 })
  @IsInt()
  @Min(1)
  @Max(TAP_COUNT_MAX)
  count!: number;
}

export class ListRoundsQueryDto {
  @ApiProperty({ enum: ['current', 'finished'] })
  @IsIn(['current', 'finished'])
  scope!: RoundScope;

  @ApiPropertyOptional({
    description:
      'Непрозрачный курсор из nextCursor предыдущей страницы того же scope; курсор другого scope или повреждённый → 400 INVALID_CURSOR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreatorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  login!: string;
}

export class RoundDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: CreatorDto })
  creator!: CreatorDto;

  @ApiProperty({ format: 'date-time' })
  startAt!: string;

  @ApiProperty({ format: 'date-time' })
  endAt!: string;

  @ApiProperty({ enum: ['cooldown', 'active', 'finished'] })
  status!: RoundStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class MyScoreDto {
  @ApiProperty({ type: 'integer' })
  taps!: number;

  @ApiProperty({ type: 'integer' })
  score!: number;
}

export class WinnerDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  login!: string;

  @ApiProperty({ type: 'integer' })
  score!: number;
}

export class ParticipantDto {
  @ApiProperty({ type: 'integer', minimum: 1 })
  place!: number;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  login!: string;

  @ApiProperty({ type: 'integer' })
  score!: number;

  @ApiProperty()
  isMe!: boolean;
}

export class RoundListResponseDto {
  @ApiProperty({ type: [RoundDto] })
  items!: RoundDto[];

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty({ format: 'date-time' })
  serverTime!: string;
}

export class RoundResponseDto {
  @ApiProperty({ type: RoundDto })
  round!: RoundDto;

  @ApiProperty({ type: MyScoreDto })
  myScore!: MyScoreDto;

  @ApiPropertyOptional({
    type: 'integer',
    description: 'Появляется после окончания окна приёма тапов (endAt + TAP_GRACE_SECONDS)',
  })
  total?: number;

  @ApiPropertyOptional({
    type: WinnerDto,
    nullable: true,
    description:
      'Появляется после окончания окна приёма тапов (endAt + TAP_GRACE_SECONDS); null, если никто не набрал очков',
  })
  winner?: WinnerDto | null;

  @ApiPropertyOptional({
    type: [ParticipantDto],
    description:
      'Появляется вместе с total и winner; топ-50 по очкам, плюс строка запрашивающего игрока последней, если он ниже 50-го места',
  })
  participants?: ParticipantDto[];

  @ApiProperty({ format: 'date-time' })
  serverTime!: string;
}

export class TapResponseDto {
  @ApiProperty({ type: 'integer' })
  taps!: number;

  @ApiProperty({ type: 'integer' })
  score!: number;

  @ApiProperty({ format: 'date-time' })
  serverTime!: string;
}

export class CreateRoundResponseDto {
  @ApiProperty({ type: RoundDto })
  round!: RoundDto;

  @ApiProperty({ format: 'date-time' })
  serverTime!: string;
}
