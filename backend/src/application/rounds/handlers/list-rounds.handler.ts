import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { decodeCursor, encodeCursor } from '../../../domain/round/services/round-cursor.codec';
import { IRoundRepository } from '../../../domain/round/repositories/round.repository.interface';
import { IClock } from '../../../domain/shared/clock';
import { CLOCK, ROUND_REPOSITORY } from '../../../domain/shared/tokens';
import { ListRoundsQuery } from '../queries/list-rounds.query';
import { RoundListResult } from '../results/round-results';

@QueryHandler(ListRoundsQuery)
export class ListRoundsHandler implements IQueryHandler<ListRoundsQuery, RoundListResult> {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: IRoundRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(query: ListRoundsQuery): Promise<RoundListResult> {
    const cursor = query.cursor === null ? null : decodeCursor(query.cursor, query.scope);
    const now = this.clock.now();
    const page = await this.rounds.findPage({ scope: query.scope, cursor, limit: query.limit, now });
    return { items: page.items, nextCursor: page.nextCursor ? encodeCursor(page.nextCursor, query.scope) : null, now };
  }
}
