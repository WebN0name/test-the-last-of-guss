import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../application/ports/password-hasher.port';

const COST = 10;

@Injectable()
export class BcryptHasher implements IPasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
