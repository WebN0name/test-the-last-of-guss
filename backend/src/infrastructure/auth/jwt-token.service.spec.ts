import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user/entities/user';
import { Env } from '../config/env';
import { JwtTokenService } from './jwt-token.service';

const env = Object.assign(new Env(), {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ACCESS_TTL: 900,
  JWT_REFRESH_TTL: 604800,
});

describe('JwtTokenService', () => {
  const jwt = new JwtService({});
  const service = new JwtTokenService(jwt, env);
  const user = User.create({
    id: '8c3eed83-8a8a-41a0-8f91-9ad501e8f8a1',
    login: 'Admin',
    passwordHash: 'h',
    now: new Date(),
  });

  it('signPair выдаёт пару, access несёт sub, login, role, type', async () => {
    const pair = await service.signPair(user);
    const access = await service.verifyAccess(pair.accessToken);
    expect(access).toEqual(expect.objectContaining({ sub: user.id, login: 'Admin', role: 'admin', type: 'access' }));
    const refresh = await service.verifyRefresh(pair.refreshToken);
    expect(refresh).toEqual(expect.objectContaining({ sub: user.id, type: 'refresh' }));
  });

  it('refresh не принимается как access и наоборот', async () => {
    const pair = await service.signPair(user);
    expect(await service.verifyAccess(pair.refreshToken)).toBeNull();
    expect(await service.verifyRefresh(pair.accessToken)).toBeNull();
  });

  it('подделанный токен → null', async () => {
    const pair = await service.signPair(user);
    const [header, body, signature] = pair.accessToken.split('.');
    const swapped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
    expect(await service.verifyAccess(`${header}.${body}.${swapped}`)).toBeNull();
    expect(await service.verifyAccess('not-a-jwt')).toBeNull();
  });

  it('токен с alg none → null', async () => {
    const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
    const header = encode({ alg: 'none', typ: 'JWT' });
    const body = encode({
      sub: user.id,
      login: 'Admin',
      role: 'admin',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    expect(await service.verifyAccess(`${header}.${body}.`)).toBeNull();
  });

  it('refresh-payload, подписанный секретом access → null в обоих verify', async () => {
    const token = await jwt.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: 60 },
    );
    expect(await service.verifyAccess(token)).toBeNull();
    expect(await service.verifyRefresh(token)).toBeNull();
  });

  it('токен с верной подписью, но чужим type → null', async () => {
    const forged = await jwt.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: 60 },
    );
    expect(await service.verifyAccess(forged)).toBeNull();
  });

  it('истёкший токен → null', async () => {
    const expired = await jwt.signAsync(
      { sub: user.id, login: 'Admin', role: 'admin', type: 'access' },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: -1 },
    );
    expect(await service.verifyAccess(expired)).toBeNull();
  });
});
