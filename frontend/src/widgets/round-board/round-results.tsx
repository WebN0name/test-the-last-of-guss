import { Fragment } from 'react';
import { Trophy } from 'lucide-react';
import { m, stagger } from 'motion/react';
import type { Participant, Winner } from '@/entities/round/types';

const fmt = new Intl.NumberFormat('ru-RU');
const list = {
  hidden: {},
  show: {
    transition: { when: 'beforeChildren', delayChildren: stagger(0.08) },
  },
};
const row = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } };

interface Props {
  total: number;
  winner: Winner | null;
  participants: Participant[];
  myScore: { taps: number; score: number };
}

export function RoundResults({ total, winner, participants, myScore }: Props) {
  return (
    <div className="flex w-full flex-col gap-4">
      <m.dl variants={list} initial="hidden" animate="show" className="flex w-full flex-col gap-2 text-left">
        <m.div variants={row} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3">
          <dt className="font-semibold">Всего</dt>
          <dd className="num text-2xl font-extrabold">{fmt.format(total)}</dd>
        </m.div>
        <m.div
          variants={row}
          className={`flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 ${winner ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}
        >
          <dt className="flex min-w-0 items-center gap-2.5 font-bold">
            {winner ? (
              <m.span
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="shrink-0"
              >
                <Trophy className="size-5" aria-hidden="true" />
              </m.span>
            ) : null}
            <span className="truncate">{winner ? `Победитель — ${winner.login}` : 'Победителя нет'}</span>
          </dt>
          <dd className="num text-2xl font-extrabold">{winner ? fmt.format(winner.score) : '—'}</dd>
        </m.div>
        <m.div variants={row} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3">
          <dt className="font-semibold">Мои очки</dt>
          <dd className="num text-2xl font-extrabold">{fmt.format(myScore.score)}</dd>
        </m.div>
      </m.dl>
      {participants.length > 0 ? (
        <m.div variants={row} initial="hidden" animate="show" transition={{ delay: 0.4 }} className="w-full text-left">
          <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-sm">
            <caption className="pb-1 text-left text-sm font-semibold text-muted-foreground">Участники</caption>
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="[&_th]:p-0">
                <th scope="col">
                  <span className="sr-only">Место</span>
                </th>
                <th scope="col">
                  <span className="sr-only">Игрок</span>
                </th>
                <th scope="col">
                  <span className="sr-only">Очки</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => {
                const isWinner = winner !== null && winner.userId === p.userId;
                const tone = p.isMe
                  ? 'border-primary bg-primary/10 border-y-2'
                  : isWinner
                    ? 'bg-accent/30'
                    : 'bg-muted';
                const gap = i > 0 && p.place > participants[i - 1].place + 1;
                return (
                  <Fragment key={p.userId}>
                    {gap ? (
                      <tr data-testid="places-gap">
                        <td colSpan={3} className="py-0.5 text-center text-muted-foreground">
                          <span aria-hidden="true">…</span>
                          <span className="sr-only">Места пропущены</span>
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className={`num rounded-l-[12px] py-2 pl-3 font-bold ${tone} ${p.isMe ? 'border-l-2' : ''}`}>
                        {p.place}
                      </td>
                      <td className={`py-2 pr-2 ${tone}`}>
                        <span className="flex min-w-0 items-center gap-2">
                          {isWinner ? <Trophy className="size-4 shrink-0" aria-hidden="true" /> : null}
                          <span className="truncate font-semibold">{p.login}</span>
                          {p.isMe ? <span className="sr-only">(это вы)</span> : null}
                        </span>
                      </td>
                      <td
                        className={`num rounded-r-[12px] py-2 pr-3 text-right font-extrabold ${tone} ${p.isMe ? 'border-r-2' : ''}`}
                      >
                        {fmt.format(p.score)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </m.div>
      ) : null}
    </div>
  );
}
