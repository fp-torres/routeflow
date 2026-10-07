import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { isoToUtcDate, type FareDto, type FareInput, type TransportType } from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { isoDate, isoDateOrNull, money } from '../../common/serialize';
import { fareSchema } from '@routeflow/types';

type FareRow = Awaited<ReturnType<Db['transportFare']['findFirstOrThrow']>>;

export function toFareDto(row: FareRow): FareDto {
  return {
    id: row.id,
    type: row.type,
    operator: row.operator,
    description: row.description,
    value: money(row.value),
    effectiveFrom: isoDate(row.effectiveFrom),
    effectiveUntil: isoDateOrNull(row.effectiveUntil),
    active: row.active,
    verified: row.verified,
  };
}

@Injectable()
export class FaresService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(): Promise<FareDto[]> {
    const rows = await this.db.transportFare.findMany({
      orderBy: [{ active: 'desc' }, { type: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return rows.map(toFareDto);
  }

  /** Tarifa vigente de um tipo de transporte em determinada data. */
  async activeFare(type: TransportType, date: string): Promise<FareDto | null> {
    const d = isoToUtcDate(date);
    const row = await this.db.transportFare.findFirst({
      where: {
        type,
        active: true,
        effectiveFrom: { lte: d },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: d } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return row ? toFareDto(row) : null;
  }

  async needsReview(): Promise<boolean> {
    return (await this.db.transportFare.count({ where: { active: true, verified: false } })) > 0;
  }

  async create(input: FareInput): Promise<FareDto> {
    const data = fareSchema.parse(input);
    const row = await this.db.transportFare.create({
      data: {
        type: data.type,
        operator: data.operator,
        description: data.description ?? null,
        value: data.value,
        effectiveFrom: isoToUtcDate(data.effectiveFrom),
        effectiveUntil: data.effectiveUntil ? isoToUtcDate(data.effectiveUntil) : null,
        active: data.active,
        verified: data.verified,
      },
    });
    return toFareDto(row);
  }

  async update(id: string, input: FareInput): Promise<FareDto> {
    const data = fareSchema.parse(input);
    const exists = await this.db.transportFare.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Tarifa não encontrada.');
    const row = await this.db.transportFare.update({
      where: { id },
      data: {
        type: data.type,
        operator: data.operator,
        description: data.description ?? null,
        value: data.value,
        effectiveFrom: isoToUtcDate(data.effectiveFrom),
        effectiveUntil: data.effectiveUntil ? isoToUtcDate(data.effectiveUntil) : null,
        active: data.active,
        verified: data.verified,
      },
    });
    return toFareDto(row);
  }

  async remove(id: string): Promise<void> {
    await this.db.transportFare.delete({ where: { id } });
  }
}
