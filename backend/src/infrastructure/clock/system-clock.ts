import { Injectable } from '@nestjs/common';
import { IClock } from '../../domain/shared/clock';

@Injectable()
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
