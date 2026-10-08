import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { GAME_CONFIG, IGameConfig } from '../../../application/ports/game-config.port';
import { AccessTokenPayload } from '../../../application/ports/token.port';
import { CreateRoundCommand } from '../../../application/rounds/commands/create-round.command';
import { TapCommand } from '../../../application/rounds/commands/tap.command';
import { GetRoundQuery } from '../../../application/rounds/queries/get-round.query';
import { ListRoundsQuery } from '../../../application/rounds/queries/list-rounds.query';
import { RoundListResult, RoundSummary, TapResult } from '../../../application/rounds/results/round-results';
import { RoundView } from '../../../domain/round/value-objects/round-page';
import { IClock } from '../../../domain/shared/clock';
import { CLOCK } from '../../../domain/shared/tokens';
import { UserRole } from '../../../domain/user/value-objects/user-role';
import { ErrorResponseDto } from '../dto/error.dto';
import {
  CreateRoundResponseDto,
  ListRoundsQueryDto,
  RoundListResponseDto,
  RoundResponseDto,
  TapDto,
  TapResponseDto,
} from '../dto/rounds.dto';
import { CurrentUser } from '../guards/current-user.decorator';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';
import { Roles } from '../guards/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { toRoundDto } from '../mappers/round-dto.mapper';

const DEFAULT_LIMIT = 20;

@ApiTags('rounds')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@UseGuards(JwtCookieGuard, RolesGuard)
@Controller('rounds')
export class RoundsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(GAME_CONFIG) private readonly config: IGameConfig,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  @Get()
  @ApiOkResponse({ type: RoundListResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async list(@Query() query: ListRoundsQueryDto): Promise<RoundListResponseDto> {
    const result = await this.queryBus.execute<ListRoundsQuery, RoundListResult>(
      new ListRoundsQuery(query.scope, query.cursor ?? null, query.limit ?? DEFAULT_LIMIT),
    );
    const { now } = result;
    return {
      items: result.items.map((v) => toRoundDto(v, now)),
      nextCursor: result.nextCursor,
      serverTime: now.toISOString(),
    };
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiCreatedResponse({ type: CreateRoundResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async create(@CurrentUser() user: AccessTokenPayload): Promise<CreateRoundResponseDto> {
    const view = await this.commandBus.execute<CreateRoundCommand, RoundView>(new CreateRoundCommand(user.sub));
    const now = this.clock.now();
    return { round: toRoundDto(view, now), serverTime: now.toISOString() };
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: RoundResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<RoundResponseDto> {
    const summary = await this.queryBus.execute<GetRoundQuery, RoundSummary>(new GetRoundQuery(id, user.sub));
    const { now } = summary;
    const base: RoundResponseDto = {
      round: toRoundDto(summary.view, now),
      myScore: summary.myScore,
      serverTime: now.toISOString(),
    };
    if (summary.total === null) return base;
    const participants = (summary.standings ?? []).map((s) => ({ ...s, isMe: s.userId === user.sub }));
    return { ...base, total: summary.total, winner: summary.winner, participants };
  }

  @Post(':id/taps')
  @ApiParam({ name: 'id', format: 'uuid' })
  @HttpCode(200)
  @ApiOkResponse({ type: TapResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnsupportedMediaTypeResponse({ type: ErrorResponseDto })
  async tap(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TapDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TapResponseDto> {
    if (dto.count > this.config.tapBatchMax) {
      throw new BadRequestException([`count must not be greater than ${this.config.tapBatchMax}`]);
    }
    const result = await this.commandBus.execute<TapCommand, TapResult>(
      new TapCommand(user.sub, user.role, id, dto.count),
    );
    return { ...result, serverTime: this.clock.now().toISOString() };
  }
}
