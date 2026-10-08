import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { roundsApi } from '@/entities/round/api';
import type { Round, RoundList, RoundScope } from '@/entities/round/types';
import { LIST_POLL_MS, ROUNDS_PAGE_SIZE } from '@/shared/config/constants';

function uniquePages(data: InfiniteData<RoundList, string | null>): Round[][] {
  const seen = new Set<string>();
  const out: Round[][] = [];
  for (const page of data.pages) {
    const group = page.items.filter((round) => !seen.has(round.id));
    group.forEach((round) => seen.add(round.id));
    if (group.length > 0) out.push(group);
  }
  return out;
}

export function useInfiniteRounds(scope: RoundScope) {
  return useInfiniteQuery({
    queryKey: ['rounds', scope],
    queryFn: ({ pageParam }) => roundsApi.list({ scope, cursor: pageParam, limit: ROUNDS_PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: scope === 'current' ? LIST_POLL_MS : false,
    staleTime: scope === 'current' ? 0 : 30_000,
    select: uniquePages,
  });
}
