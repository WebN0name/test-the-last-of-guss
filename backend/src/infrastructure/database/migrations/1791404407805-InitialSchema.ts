import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791404407805 implements MigrationInterface {
  name = 'InitialSchema1791404407805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('admin', 'survivor', 'nikita')`);
    await queryRunner.query(`
      CREATE TABLE users (
        id            uuid        PRIMARY KEY,
        login         text        NOT NULL UNIQUE,
        password_hash text        NOT NULL,
        role          user_role   NOT NULL,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE rounds (
        id          uuid        PRIMARY KEY,
        creator_id  uuid        NOT NULL REFERENCES users(id),
        start_at    timestamptz NOT NULL,
        end_at      timestamptz NOT NULL,
        total_score integer     NOT NULL DEFAULT 0 CHECK (total_score >= 0),
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT rounds_time_order CHECK (created_at <= start_at AND start_at < end_at)
      )
    `);
    await queryRunner.query(`CREATE INDEX rounds_end_at_id_idx ON rounds (end_at, id)`);
    await queryRunner.query(`
      CREATE TABLE scores (
        round_id   uuid        NOT NULL REFERENCES rounds(id),
        user_id    uuid        NOT NULL REFERENCES users(id),
        taps       integer     NOT NULL DEFAULT 0 CHECK (taps >= 0),
        score      integer     NOT NULL DEFAULT 0 CHECK (score >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (round_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX scores_leaderboard_idx ON scores (round_id, score DESC, updated_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE scores`);
    await queryRunner.query(`DROP TABLE rounds`);
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TYPE user_role`);
  }
}
