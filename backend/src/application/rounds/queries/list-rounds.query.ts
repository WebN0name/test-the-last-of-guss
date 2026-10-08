import { RoundScope } from '../../../domain/round/value-objects/round-page';

export class ListRoundsQuery {
  constructor(
    readonly scope: RoundScope,
    readonly cursor: string | null,
    readonly limit: number,
  ) {}
}
