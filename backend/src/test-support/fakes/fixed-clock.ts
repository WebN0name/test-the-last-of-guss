import { IClock } from '../../domain/shared/clock';

export class FixedClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }

  advance(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}
