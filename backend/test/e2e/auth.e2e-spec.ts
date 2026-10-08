import request from 'supertest';
import { cookieHeader, cookiesOf, createE2eApp, E2eContext, resetDb, sleep } from './setup/app';

describe('auth (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDb(ctx.ds);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const server = () => ctx.app.getHttpServer();

  it('первый вход создаёт пользователя, ставит cookies с нужными атрибутами', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .send({ login: 'Admin', password: 'secret-1' })
      .expect(200);
    expect(res.body).toEqual({ user: { id: expect.any(String), login: 'Admin', role: 'admin' }, created: true });

    const raw = res.headers['set-cookie'] as unknown as string[];
    const access = raw.find((c) => c.startsWith('access_token='))!;
    const refresh = raw.find((c) => c.startsWith('refresh_token='))!;
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/SameSite=Strict/);
    expect(access).toMatch(/Path=\/api(;|$)/);
    expect(refresh).toMatch(/Path=\/api\/auth\/refresh/);
    expect(access).not.toMatch(/Secure/);

    const me = await request(server())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader(cookiesOf(res)))
      .expect(200);
    expect(me.body.user.login).toBe('Admin');
  });

  it('повторный вход с верным паролем — created=false, пользователь один', async () => {
    await request(server()).post('/api/auth/login').send({ login: 'nikita', password: 'pw-123' }).expect(200);
    const res = await request(server())
      .post('/api/auth/login')
      .send({ login: 'nikita', password: 'pw-123' })
      .expect(200);
    expect(res.body.created).toBe(false);
    expect(res.body.user.role).toBe('nikita');
    const rows: { n: string }[] = await ctx.ds.query('SELECT count(*)::text AS n FROM users');
    expect(rows[0].n).toBe('1');
  });

  it('неверный пароль к существующему имени → 401 INVALID_CREDENTIALS, cookies не выставлены', async () => {
    await request(server()).post('/api/auth/login').send({ login: 'Иван', password: 'pw-123' });
    const res = await request(server())
      .post('/api/auth/login')
      .send({ login: 'Иван', password: 'wrong-1' })
      .expect(401);
    expect(res.body).toEqual({ statusCode: 401, code: 'INVALID_CREDENTIALS', message: expect.any(String) });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('два параллельных первых входа → оба 200, один пользователь', async () => {
    const [a, b] = await Promise.all([
      request(server()).post('/api/auth/login').send({ login: 'racer', password: 'pw-123' }),
      request(server()).post('/api/auth/login').send({ login: 'racer', password: 'pw-123' }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.user.id).toBe(b.body.user.id);
    const rows: { n: string }[] = await ctx.ds.query('SELECT count(*)::text AS n FROM users');
    expect(rows[0].n).toBe('1');
  });

  it('валидация: пробелы по краям и короткий пароль → 400 VALIDATION_ERROR; лишнее поле role игнорируется, ответ 200', async () => {
    const a = await request(server()).post('/api/auth/login').send({ login: ' Иван ', password: 'pw-123' }).expect(400);
    expect(a.body.code).toBe('VALIDATION_ERROR');
    expect(a.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/login/)]));
    const b = await request(server()).post('/api/auth/login').send({ login: 'Иван', password: 'pw' }).expect(400);
    expect(b.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/password/)]));
    await request(server())
      .post('/api/auth/login')
      .send({ login: 'Иван', password: 'pw-123', role: 'admin' })
      .expect(200);
    const rows: { role: string }[] = await ctx.ds.query(`SELECT role FROM users WHERE login = 'Иван'`);
    expect(rows[0].role).toBe('survivor');
  });

  it('refresh выдаёт новую пару; refresh-cookie на /me и access на /refresh → 401', async () => {
    const login = await request(server()).post('/api/auth/login').send({ login: 'Иван', password: 'pw-123' });
    const cookies = cookiesOf(login);

    await request(server()).get('/api/auth/me').set('Cookie', `access_token=${cookies.refresh_token}`).expect(401);
    await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${cookies.access_token}`)
      .expect(401);

    const refreshed = await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${cookies.refresh_token}`)
      .expect(200);
    const fresh = cookiesOf(refreshed);
    expect(fresh.access_token).toBeDefined();
    expect(refreshed.body.user.login).toBe('Иван');
    await request(server()).get('/api/auth/me').set('Cookie', `access_token=${fresh.access_token}`).expect(200);
  });

  it('истёкший access → 401, после refresh снова 200', async () => {
    const login = await request(server()).post('/api/auth/login').send({ login: 'Иван', password: 'pw-123' });
    const cookies = cookiesOf(login);
    await sleep(5200);
    await request(server()).get('/api/auth/me').set('Cookie', `access_token=${cookies.access_token}`).expect(401);
    const refreshed = await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${cookies.refresh_token}`)
      .expect(200);
    await request(server())
      .get('/api/auth/me')
      .set('Cookie', `access_token=${cookiesOf(refreshed).access_token}`)
      .expect(200);
  });

  it('logout очищает обе cookie', async () => {
    const login = await request(server()).post('/api/auth/login').send({ login: 'Иван', password: 'pw-123' });
    const res = await request(server())
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader(cookiesOf(login)))
      .expect(204);
    const raw = res.headers['set-cookie'] as unknown as string[];
    const access = raw.find((c) => c.startsWith('access_token=;'))!;
    const refresh = raw.find((c) => c.startsWith('refresh_token=;'))!;
    expect(access).toMatch(/Path=\/api(;|$)/);
    expect(refresh).toMatch(/Path=\/api\/auth\/refresh(;|$)/);
  });

  it('login: битый JSON → 400 VALIDATION_ERROR в едином формате', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"login":')
      .expect(400);
    expect(res.body).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', message: ['Malformed JSON body'] });
  });

  it('login: слишком большое тело → 413 PAYLOAD_TOO_LARGE в едином формате', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ login: 'Иван', password: 'x'.repeat(200_000) }))
      .expect(413);
    expect(res.body).toEqual({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: ['Request body too large'] });
  });

  it('logout без тела и без Content-Type проходит', async () => {
    await request(server()).post('/api/auth/logout').expect(204);
  });

  it('login: form-urlencoded → 415 UNSUPPORTED_MEDIA_TYPE, cookies не ставятся', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .type('form')
      .send('login=Ivan&password=pw-123')
      .expect(415);
    expect(res.body).toEqual({ statusCode: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: expect.any(String) });
    expect(res.headers['set-cookie']).toBeUndefined();
    const rows: { n: string }[] = await ctx.ds.query('SELECT count(*)::text AS n FROM users');
    expect(rows[0].n).toBe('0');
  });

  it('login: text/plain → 415', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .set('Content-Type', 'text/plain')
      .send('{"login":"Ivan","password":"pw-123"}')
      .expect(415);
    expect(res.body.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('login: application/json; charset=utf-8 принимается', async () => {
    await request(server())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json; charset=utf-8')
      .send(JSON.stringify({ login: 'Ivan', password: 'pw-123' }))
      .expect(200);
  });

  it('login: управляющие и zero-width символы в логине → 400', async () => {
    const a = await request(server())
      .post('/api/auth/login')
      .send({ login: 'ab\u0000cd', password: 'pw-123' })
      .expect(400);
    expect(a.body.code).toBe('VALIDATION_ERROR');
    await request(server()).post('/api/auth/login').send({ login: '\u200bzw\u200b', password: 'pw-123' }).expect(400);
  });

  it('login: одиночный суррогат в логине → 400', async () => {
    await request(server()).post('/api/auth/login').send({ login: '\uD800ab', password: 'pw-123' }).expect(400);
  });

  it('login: charset=latin1 → 415 в едином формате', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json; charset=latin1')
      .send('{"login":"Ivan","password":"pw-123"}')
      .expect(415);
    expect(res.body).toEqual({
      statusCode: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: ['Unsupported request body'],
    });
  });

  it('login: пароль 74 байта (37 кириллических символов) → 400', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .send({ login: 'Иван', password: 'я'.repeat(37) })
      .expect(400);
    expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/password/)]));
  });

  it('login: cookies имеют HttpOnly, SameSite=Strict и Max-Age по TTL', async () => {
    const res = await request(server()).post('/api/auth/login').send({ login: 'Иван', password: 'pw-123' }).expect(200);
    const raw = res.headers['set-cookie'] as unknown as string[];
    const access = raw.find((c) => c.startsWith('access_token='))!;
    const refresh = raw.find((c) => c.startsWith('refresh_token='))!;
    for (const c of [access, refresh]) {
      expect(c).toMatch(/HttpOnly/);
      expect(c).toMatch(/SameSite=Strict/);
    }
    expect(access).toMatch(/Max-Age=5(;|$)/);
    expect(refresh).toMatch(/Max-Age=600(;|$)/);
  });

  it('/me без cookie → 401 UNAUTHORIZED', async () => {
    const res = await request(server()).get('/api/auth/me').expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
