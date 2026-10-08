import { UserRole } from '../../../domain/user/value-objects/user-role';

export class TapCommand {
  constructor(
    readonly userId: string,
    readonly role: UserRole,
    readonly roundId: string,
    readonly count: number,
  ) {}
}
