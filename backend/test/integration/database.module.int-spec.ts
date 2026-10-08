import { config } from 'dotenv';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { IUserRepository } from '../../src/domain/user/repositories/user.repository.interface';
import { CLOCK, USER_REPOSITORY } from '../../src/domain/shared/tokens';
import { IClock } from '../../src/domain/shared/clock';

config({ path: '.env.test', override: true, quiet: true });

describe('AppModule wiring', () => {
  it('поднимает модуль, резолвит репозитории и часы', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const users = app.get<IUserRepository>(USER_REPOSITORY);
    const clock = app.get<IClock>(CLOCK);
    const ds = app.get(DataSource);

    expect(typeof users.findByLogin).toBe('function');
    expect(clock.now()).toBeInstanceOf(Date);
    expect(ds.isInitialized).toBe(true);

    await app.close();
  });
});
