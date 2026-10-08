import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Round } from '../../../domain/round/entities/round';
import { RoundView } from '../../../domain/round/value-objects/round-page';
import { ForbiddenError } from '../../../domain/round/errors/round.errors';
import { IRoundRepository } from '../../../domain/round/repositories/round.repository.interface';
import { IClock } from '../../../domain/shared/clock';
import { CLOCK, ROUND_REPOSITORY, USER_REPOSITORY } from '../../../domain/shared/tokens';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { GAME_CONFIG, IGameConfig } from '../../ports/game-config.port';
import { CreateRoundCommand } from '../commands/create-round.command';

@CommandHandler(CreateRoundCommand)
export class CreateRoundHandler implements ICommandHandler<CreateRoundCommand, RoundView> {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: IRoundRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(GAME_CONFIG) private readonly config: IGameConfig,
  ) {}

  async execute(command: CreateRoundCommand): Promise<RoundView> {
    const user = await this.users.findById(command.userId);
    if (!user || !user.isAdmin()) throw new ForbiddenError('create round');

    const round = Round.create({
      id: randomUUID(),
      creatorId: user.id,
      now: this.clock.now(),
      cooldownSec: this.config.cooldownSec,
      durationSec: this.config.roundDurationSec,
    });
    await this.rounds.insert(round);
    return { round, creatorLogin: user.login };
  }
}
