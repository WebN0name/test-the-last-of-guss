import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Round } from '../../../domain/round/entities/round';
import { FindPageParams, RoundPage, RoundView } from '../../../domain/round/value-objects/round-page';
import { IRoundRepository } from '../../../domain/round/repositories/round.repository.interface';
import { RoundOrmEntity } from '../entities/round.orm-entity';
import { RoundMapper, RoundViewRow } from '../mappers/round.mapper';
import { PAGE_SQL, VIEW_SELECT } from './sql/round.sql';

@Injectable()
export class TypeOrmRoundRepository implements IRoundRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async insert(round: Round): Promise<void> {
    await this.dataSource.getRepository(RoundOrmEntity).insert(RoundMapper.toOrm(round));
  }

  async findById(id: string): Promise<Round | null> {
    const entity = await this.dataSource.getRepository(RoundOrmEntity).findOne({ where: { id } });
    return entity ? RoundMapper.toDomain(entity) : null;
  }

  async findViewById(id: string): Promise<RoundView | null> {
    const rows = await this.dataSource.query<RoundViewRow[]>(`${VIEW_SELECT} WHERE r.id = $1`, [id]);
    const row = rows[0];
    return row ? RoundMapper.rowToView(row) : null;
  }

  async findPage(params: FindPageParams): Promise<RoundPage> {
    const rows = await this.dataSource.query<RoundViewRow[]>(PAGE_SQL[params.scope], [
      params.now,
      params.cursor?.sortValue ?? null,
      params.cursor?.id ?? null,
      params.limit + 1,
    ]);
    const hasMore = rows.length > params.limit;
    const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
    const items = pageRows.map((row) => RoundMapper.rowToView(row));
    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last ? { sortValue: params.scope === 'finished' ? last.end_at : last.start_at, id: last.id } : null;
    return { items, nextCursor };
  }
}
