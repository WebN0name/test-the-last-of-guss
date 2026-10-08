import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './controllers/auth.controller';
import { RoundsController } from './controllers/rounds.controller';

@Module({
  imports: [CqrsModule],
  controllers: [AuthController, RoundsController],
})
export class HttpModule {}
