import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { LoginCommand } from '../../../application/auth/commands/login.command';
import { RefreshCommand } from '../../../application/auth/commands/refresh.command';
import { GetMeQuery } from '../../../application/auth/queries/get-me.query';
import { AuthResult } from '../../../application/auth/results/auth-result';
import { AccessTokenPayload } from '../../../application/ports/token.port';
import { User } from '../../../domain/user/entities/user';
import { Env } from '../../../infrastructure/config/env';
import { clearAuthCookies, setAuthCookies } from '../cookies/auth-cookies';
import { AuthResponseDto, LoginDto, MeResponseDto } from '../dto/auth.dto';
import { ErrorResponseDto } from '../dto/error.dto';
import { RefreshRequest } from '../guards/authenticated-request';
import { CurrentUser } from '../guards/current-user.decorator';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';
import { RefreshCookieGuard } from '../guards/refresh-cookie.guard';
import { toUserDto } from '../mappers/user-dto.mapper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly env: Env,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiUnsupportedMediaTypeResponse({ type: ErrorResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.commandBus.execute<LoginCommand, AuthResult>(new LoginCommand(dto.login, dto.password));
    setAuthCookies(res, result.tokens, this.env);
    return { user: toUserDto(result.user), created: result.created };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(RefreshCookieGuard)
  @ApiCookieAuth('refresh_token')
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async refresh(@Req() req: RefreshRequest, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.commandBus.execute<RefreshCommand, AuthResult>(new RefreshCommand(req.refreshUser.sub));
    setAuthCookies(res, result.tokens, this.env);
    return { user: toUserDto(result.user), created: false };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse()
  logout(@Res({ passthrough: true }) res: Response): void {
    clearAuthCookies(res, this.env);
  }

  @Get('me')
  @UseGuards(JwtCookieGuard)
  @ApiCookieAuth('access_token')
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async me(@CurrentUser() user: AccessTokenPayload): Promise<MeResponseDto> {
    const found = await this.queryBus.execute<GetMeQuery, User>(new GetMeQuery(user.sub));
    return { user: toUserDto(found) };
  }
}
