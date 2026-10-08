import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetMeHandler } from './handlers/get-me.handler';
import { LoginHandler } from './handlers/login.handler';
import { RefreshHandler } from './handlers/refresh.handler';

@Module({
  imports: [CqrsModule],
  providers: [LoginHandler, RefreshHandler, GetMeHandler],
})
export class AuthModule {}
