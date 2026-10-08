import request from 'supertest';
import { cookieHeader, cookiesOf, createE2eApp, E2eContext, resetDb, waitForRoundStart } from './setup/app';

describe('rounds (e2e)', () => {
  let ctx: E2eContext;
  let admin: string;
  let ivan: string;
  let nikita: string;

  const server = () => ctx.app.getHttpServer();

  const loginAs = async (login: string): Promise<string> => {
    const res = await request(server()).post('/api/auth/login').send({ login, password: 'pw-123456' });
    return cookieHeader(cookiesOf(res));
  };

  const insertFinishedRound = async (creatorLogin: string, totalScore: number): Promise<string> => {
    const rows: { id: string }[] = await ctx.ds.query(
      `INSERT INTO rounds (id, creator_id, created_at, start_at, end_at, total_score)
       SELECT gen_random_uuid(), id, now() - interval '3 min', now() - interval '2 min', now() - interval '1 min', $2 FROM users WHERE login = $1 RETURNING id`,
      [creatorLogin, totalScore],
    );
    return rows[0].id;
  };

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDb(ctx.ds);
    admin = await loginAs('Admin');
    ivan = await loginAs('Иван');
    nikita = await loginAs('nikita');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('без cookie → 401', async () => {
    await request(server()).get('/api/rounds').expect(401);
    await request(server()).post('/api/rounds').expect(401);
  });

  it('survivor не может создать раунд → 403 FORBIDDEN', async () => {
    const res = await request(server()).post('/api/rounds').set('Cookie', ivan).expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('admin создаёт раунд: 201, active при нулевом cooldown, creator.login, serverTime', async () => {
    const res = await request(server()).post('/api/rounds').set('Cookie', admin).expect(201);
    expect(res.body.round).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: 'active',
        creator: { id: expect.any(String), login: 'Admin' },
      }),
    );
    expect(new Date(res.body.round.endAt).getTime() - new Date(res.body.round.startAt).getTime()).toBe(60_000);
    expect(typeof res.body.serverTime).toBe('string');
  });

  it('тап: count 3 → taps 3, score 3; одиннадцатый даёт 10', async () => {
    const { body } = await request(server()).post('/api/rounds').set('Cookie', admin);
    const id: string = body.round.id;
    await waitForRoundStart(ctx.ds, id);
    const first = await request(server())
      .post(`/api/rounds/${id}/taps`)
      .set('Cookie', ivan)
      .send({ count: 3 })
      .expect(200);
    expect(first.body).toEqual({ taps: 3, score: 3, serverTime: expect.any(String) });
    await request(server()).post(`/api/rounds/${id}/taps`).set('Cookie', ivan).send({ count: 7 });
    const eleventh = await request(server())
      .post(`/api/rounds/${id}/taps`)
      .set('Cookie', ivan)
      .send({ count: 1 })
      .expect(200);
    expect(eleventh.body).toEqual(expect.objectContaining({ taps: 11, score: 20 }));
  });

  it('валидация count: 0, 21, 1.5, строка, отсутствие → 400 VALIDATION_ERROR, в базе пусто', async () => {
    const { body } = await request(server()).post('/api/rounds').set('Cookie', admin);
    const id: string = body.round.id;
    await waitForRoundStart(ctx.ds, id);
    for (const payload of [{ count: 0 }, { count: 21 }, { count: 1.5 }, { count: '3' }, {}, { count: -1 }]) {
      const res = await request(server()).post(`/api/rounds/${id}/taps`).set('Cookie', ivan).send(payload).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
    const rows: { n: string }[] = await ctx.ds.query('SELECT count(*)::text AS n FROM scores');
    expect(rows[0].n).toBe('0');
  });

  it('nikita: тап проходит, возвращает нули, строка 0/0 фиксирует участие', async () => {
    const { body } = await request(server()).post('/api/rounds').set('Cookie', admin);
    await waitForRoundStart(ctx.ds, body.round.id);
    const res = await request(server())
      .post(`/api/rounds/${body.round.id}/taps`)
      .set('Cookie', nikita)
      .send({ count: 5 })
      .expect(200);
    expect(res.body).toEqual(expect.objectContaining({ taps: 0, score: 0 }));
    const rows: { n: string }[] = await ctx.ds.query('SELECT count(*)::text AS n FROM scores');
    expect(rows[0].n).toBe('1');
    const mine: { taps: number; score: number }[] = await ctx.ds.query('SELECT taps, score FROM scores');
    expect(mine[0]).toEqual({ taps: 0, score: 0 });
    const total: { total_score: number }[] = await ctx.ds.query('SELECT total_score FROM rounds');
    expect(total[0].total_score).toBe(0);
  });

  it('несуществующий раунд → 404, невалидный uuid → 400', async () => {
    await request(server())
      .post('/api/rounds/00000000-0000-0000-0000-000000000000/taps')
      .set('Cookie', ivan)
      .send({ count: 1 })
      .expect(404);
    await request(server()).get('/api/rounds/not-a-uuid').set('Cookie', ivan).expect(400);
  });

  it('завершённый раунд: GET отдаёт total и winner, тап → 409 ROUND_NOT_ACTIVE', async () => {
    const id = await insertFinishedRound('Admin', 15);
    const ivanId: { id: string }[] = await ctx.ds.query(`SELECT id FROM users WHERE login = 'Иван'`);
    await ctx.ds.query(`INSERT INTO scores (round_id, user_id, taps, score) VALUES ($1, $2, 15, 15)`, [
      id,
      ivanId[0].id,
    ]);

    const res = await request(server()).get(`/api/rounds/${id}`).set('Cookie', ivan).expect(200);
    expect(res.body.round.status).toBe('finished');
    expect(res.body.total).toBe(15);
    expect(res.body.winner).toEqual({ userId: ivanId[0].id, login: 'Иван', score: 15 });
    expect(res.body.myScore).toEqual({ taps: 15, score: 15 });

    const tap = await request(server())
      .post(`/api/rounds/${id}/taps`)
      .set('Cookie', ivan)
      .send({ count: 1 })
      .expect(409);
    expect(tap.body.code).toBe('ROUND_NOT_ACTIVE');
  });

  it('завершённый раунд: participants по месту, isMe у запросившего, без Никиты', async () => {
    const id = await insertFinishedRound('Admin', 0);
    const petr = await loginAs('Пётр');
    const ids: { id: string; login: string }[] = await ctx.ds.query(`SELECT id, login FROM users`);
    const idOf = (login: string) => ids.find((u) => u.login === login)!.id;
    await ctx.ds.query(
      `INSERT INTO scores (round_id, user_id, taps, score, updated_at) VALUES
        ($1, $2, 5, 5, now() - interval '10 s'),
        ($1, $3, 9, 9, now())`,
      [id, idOf('Иван'), idOf('Пётр')],
    );
    const res = await request(server()).get(`/api/rounds/${id}`).set('Cookie', petr).expect(200);
    expect(res.body.participants).toEqual([
      { place: 1, userId: idOf('Пётр'), login: 'Пётр', score: 9, isMe: true },
      { place: 2, userId: idOf('Иван'), login: 'Иван', score: 5, isMe: false },
    ]);
    const other = await request(server()).get(`/api/rounds/${id}`).set('Cookie', ivan).expect(200);
    expect(other.body.participants.map((x: { isMe: boolean }) => x.isMe)).toEqual([false, true]);
  });

  it('Никита тапает в активном раунде (200, нули), в participants он с 0 последним, total без него', async () => {
    const { body } = await request(server()).post('/api/rounds').set('Cookie', admin);
    const id: string = body.round.id;
    await waitForRoundStart(ctx.ds, id);
    const nikitaTap = await request(server())
      .post(`/api/rounds/${id}/taps`)
      .set('Cookie', nikita)
      .send({ count: 3 })
      .expect(200);
    expect(nikitaTap.body).toEqual(expect.objectContaining({ taps: 0, score: 0 }));
    await request(server()).post(`/api/rounds/${id}/taps`).set('Cookie', ivan).send({ count: 2 }).expect(200);
    await ctx.ds.query(
      `UPDATE rounds SET created_at = now() - interval '10 min', start_at = now() - interval '9 min', end_at = now() - interval '5 min' WHERE id = $1`,
      [id],
    );
    const res = await request(server()).get(`/api/rounds/${id}`).set('Cookie', ivan).expect(200);
    expect(res.body.participants.map((x: { login: string; score: number }) => [x.login, x.score])).toEqual([
      ['Иван', 2],
      ['nikita', 0],
    ]);
    expect(res.body.total).toBe(2);
    expect(res.body.winner.login).toBe('Иван');
  });

  it('завершённый раунд без участников: participants пустой массив', async () => {
    const id = await insertFinishedRound('Admin', 0);
    const res = await request(server()).get(`/api/rounds/${id}`).set('Cookie', ivan).expect(200);
    expect(res.body.participants).toEqual([]);
  });

  it('окно приёма тапов: GET → finished без total и winner, тап ещё принимается', async () => {
    const rows: { id: string }[] = await ctx.ds.query(
      `INSERT INTO rounds (id, creator_id, created_at, start_at, end_at, total_score)
       SELECT gen_random_uuid(), id, now() - interval '3 min', now() - interval '2 min', now() - interval '5 seconds', 0 FROM users WHERE login = 'Admin' RETURNING id`,
    );
    const id = rows[0].id;
    const res = await request(server()).get(`/api/rounds/${id}`).set('Cookie', ivan).expect(200);
    expect(res.body.round.status).toBe('finished');
    expect(res.body).not.toHaveProperty('total');
    expect(res.body).not.toHaveProperty('winner');
    expect(res.body).not.toHaveProperty('participants');
    await request(server()).post(`/api/rounds/${id}/taps`).set('Cookie', ivan).send({ count: 1 }).expect(200);
  });

  it('активный раунд: GET без total и winner, myScore нули для не тапавшего', async () => {
    const { body } = await request(server()).post('/api/rounds').set('Cookie', admin);
    const res = await request(server()).get(`/api/rounds/${body.round.id}`).set('Cookie', ivan).expect(200);
    expect(res.body.total).toBeUndefined();
    expect(res.body.winner).toBeUndefined();
    expect(res.body).not.toHaveProperty('participants');
    expect(res.body.myScore).toEqual({ taps: 0, score: 0 });
  });

  it('список: current и finished, курсор, лимит, мусорный курсор → 400 INVALID_CURSOR', async () => {
    await insertFinishedRound('Admin', 0);
    await insertFinishedRound('Admin', 0);
    await insertFinishedRound('Admin', 0);
    await request(server()).post('/api/rounds').set('Cookie', admin);

    const current = await request(server()).get('/api/rounds?scope=current').set('Cookie', ivan).expect(200);
    expect(current.body.items).toHaveLength(1);
    expect(current.body.nextCursor).toBeNull();

    const p1 = await request(server()).get('/api/rounds?scope=finished&limit=2').set('Cookie', ivan).expect(200);
    expect(p1.body.items).toHaveLength(2);
    expect(typeof p1.body.nextCursor).toBe('string');
    const p2 = await request(server())
      .get(`/api/rounds?scope=finished&limit=2&cursor=${encodeURIComponent(p1.body.nextCursor)}`)
      .set('Cookie', ivan)
      .expect(200);
    expect(p2.body.items).toHaveLength(1);
    expect(p2.body.nextCursor).toBeNull();

    const bad = await request(server())
      .get('/api/rounds?scope=finished&cursor=%D0%BC%D1%83%D1%81%D0%BE%D1%80')
      .set('Cookie', ivan)
      .expect(400);
    expect(bad.body.code).toBe('INVALID_CURSOR');

    const foreign = await request(server())
      .get(`/api/rounds?scope=current&cursor=${encodeURIComponent(p1.body.nextCursor)}`)
      .set('Cookie', ivan)
      .expect(400);
    expect(foreign.body.code).toBe('INVALID_CURSOR');

    await request(server()).get('/api/rounds?scope=unknown').set('Cookie', ivan).expect(400);
    await request(server()).get('/api/rounds?scope=current&limit=51').set('Cookie', ivan).expect(400);
  });
});
