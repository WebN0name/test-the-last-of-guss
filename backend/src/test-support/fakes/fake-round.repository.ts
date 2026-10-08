import { Round } from '../../domain/round/entities/round';
import { FindPageParams, RoundPage, RoundView } from '../../domain/round/value-objects/round-page';
import { IRoundRepository } from '../../domain/round/repositories/round.repository.interface';

export class FakeRoundRepository implements IRoundRepository {
  readonly rounds = new Map<string, Round>();
  readonly creatorLogins = new Map<string, string>();

  async insert(round: Round): Promise<void> {
    this.rounds.set(round.id, round);
  }

  async findById(id: string): Promise<Round | null> {
    return this.rounds.get(id) ?? null;
  }

  async findViewById(id: string): Promise<RoundView | null> {
    const round = this.rounds.get(id);
    return round ? { round, creatorLogin: this.creatorLogins.get(round.creatorId) ?? 'admin' } : null;
  }

  async findPage(params: FindPageParams): Promise<RoundPage> {
    const all = [...this.rounds.values()];
    const finished = params.scope === 'finished';
    const filtered = finished ? all.filter((r) => r.endAt <= params.now) : all.filter((r) => r.endAt > params.now);
    const key = (r: Round): Date => (finished ? r.endAt : r.startAt);
    const dir = finished ? -1 : 1;
    const sorted = filtered.sort(
      (a, b) => dir * (key(a).getTime() - key(b).getTime()) || dir * a.id.localeCompare(b.id),
    );
    const cursor = params.cursor;
    const afterCursor = cursor
      ? sorted.filter((r) => {
          const cmp = key(r).getTime() - cursor.sortValue.getTime() || r.id.localeCompare(cursor.id);
          return finished ? cmp < 0 : cmp > 0;
        })
      : sorted;
    const page = afterCursor.slice(0, params.limit);
    const hasMore = afterCursor.length > params.limit;
    const last = page[page.length - 1];
    return {
      items: page.map((round) => ({ round, creatorLogin: this.creatorLogins.get(round.creatorId) ?? 'admin' })),
      nextCursor: hasMore && last ? { sortValue: key(last), id: last.id } : null,
    };
  }
}
