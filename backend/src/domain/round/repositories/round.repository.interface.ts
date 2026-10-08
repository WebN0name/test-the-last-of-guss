import { Round } from '../entities/round';
import { FindPageParams, RoundPage, RoundView } from '../value-objects/round-page';

export interface IRoundRepository {
  insert(round: Round): Promise<void>;
  findById(id: string): Promise<Round | null>;
  findViewById(id: string): Promise<RoundView | null>;
  findPage(params: FindPageParams): Promise<RoundPage>;
}
