import { BcryptHasher } from './bcrypt-hasher';

describe('BcryptHasher', () => {
  const hasher = new BcryptHasher();

  it('хеш не равен паролю и проверяется', async () => {
    const hash = await hasher.hash('secret-1');
    expect(hash).not.toBe('secret-1');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await hasher.compare('secret-1', hash)).toBe(true);
    expect(await hasher.compare('secret-2', hash)).toBe(false);
  });

  it('два хеша одного пароля различаются солью', async () => {
    expect(await hasher.hash('x'.repeat(10))).not.toBe(await hasher.hash('x'.repeat(10)));
  });
});
