import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from './application/auth/auth.module';
import { RoundsModule } from './application/rounds/rounds.module';
import { AuthInfraModule } from './infrastructure/auth/auth-infra.module';
import { ClockModule } from './infrastructure/clock/clock.module';
import { EnvModule } from './infrastructure/config/env.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HttpModule } from './interfaces/http/http.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    EnvModule,
    ClockModule,
    DatabaseModule,
    AuthInfraModule,
    AuthModule,
    RoundsModule,
    HttpModule,
  ],
})
export class AppModule {}
