import { RoundView } from '../../../domain/round/value-objects/round-page';
import { RoundDto } from '../dto/rounds.dto';

export function toRoundDto(view: RoundView, now: Date): RoundDto {
  const { round } = view;
  return {
    id: round.id,
    creator: { id: round.creatorId, login: view.creatorLogin },
    startAt: round.startAt.toISOString(),
    endAt: round.endAt.toISOString(),
    status: round.statusAt(now),
    createdAt: round.createdAt.toISOString(),
  };
}
