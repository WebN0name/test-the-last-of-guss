import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateRoundHandler } from './handlers/create-round.handler';
import { GetRoundHandler } from './handlers/get-round.handler';
import { ListRoundsHandler } from './handlers/list-rounds.handler';
import { TapHandler } from './handlers/tap.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateRoundHandler, TapHandler, ListRoundsHandler, GetRoundHandler],
})
export class RoundsModule {}
