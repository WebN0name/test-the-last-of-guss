import { DataSource } from 'typeorm';
import { createTestDataSource } from './setup/test-db';

describe('migrations', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await createTestDataSource();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('создаёт три таблицы и enum', async () => {
    const tables: { table_name: string }[] = await ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','rounds','scores') ORDER BY table_name`,
    );
    expect(tables.map((t) => t.table_name)).toEqual(['rounds', 'scores', 'users']);

    const enums: { enumlabel: string }[] = await ds.query(
      `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'user_role' ORDER BY enumsortorder`,
    );
    expect(enums.map((e) => e.enumlabel)).toEqual(['admin', 'survivor', 'nikita']);
  });

  it('создаёт индексы', async () => {
    const idx: { indexname: string }[] = await ds.query(
      `SELECT indexname FROM pg_indexes WHERE tablename IN ('rounds','scores') AND indexname IN ('rounds_end_at_id_idx','scores_leaderboard_idx') ORDER BY indexname`,
    );
    expect(idx.map((i) => i.indexname)).toEqual(['rounds_end_at_id_idx', 'scores_leaderboard_idx']);
  });

  it('повторный runMigrations ничего не делает', async () => {
    const ran = await ds.runMigrations();
    expect(ran).toHaveLength(0);
  });

  it('CHECK отклоняет раунд с концом раньше старта', async () => {
    await ds.query(
      `INSERT INTO users (id, login, password_hash, role) VALUES ('00000000-0000-0000-0000-000000000001', 'u', 'h', 'survivor') ON CONFLICT DO NOTHING`,
    );
    await expect(
      ds.query(
        `INSERT INTO rounds (id, creator_id, start_at, end_at) VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', now(), now() - interval '1 minute')`,
      ),
    ).rejects.toThrow(/rounds_time_order/);
  });
});
