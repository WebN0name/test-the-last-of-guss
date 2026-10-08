import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PASSWORD_HASHER, TOKEN_SERVICE } from '../../domain/shared/tokens';
import { BcryptHasher } from '../security/bcrypt-hasher';
import { JwtTokenService } from './jwt-token.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    { provide: PASSWORD_HASHER, useClass: BcryptHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [PASSWORD_HASHER, TOKEN_SERVICE],
})
export class AuthInfraModule {}
