import { Inject, Injectable } from '@nestjs/common';
import type { HomeAddressDto, HomeAddressInput } from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { GeocodingService } from '../geocoding/geocoding.service';

/** Endereço residencial do funcionário: origem e destino final das rotas (Casa -> lojas -> Casa). */
@Injectable()
export class HomeAddressService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly geocoding: GeocodingService,
  ) {}

  async getActive(employeeId: string): Promise<HomeAddressDto | null> {
    const row = await this.db.homeAddress.findFirst({
      where: { employeeId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    return row
      ? {
          id: row.id,
          address: row.address,
          label: row.label,
          latitude: row.latitude,
          longitude: row.longitude,
          active: row.active,
        }
      : null;
  }

  /** Mantém o histórico: desativa o endereço anterior e cria o novo como ativo. */
  async set(employeeId: string, input: HomeAddressInput): Promise<HomeAddressDto> {
    let latitude = input.latitude ?? null;
    let longitude = input.longitude ?? null;
    if (latitude == null || longitude == null) {
      const result = await this.geocoding.geocode({ address: input.address });
      if (result) ({ latitude, longitude } = result);
    }
    const created = await this.db.$transaction(async (tx) => {
      await tx.homeAddress.updateMany({
        where: { employeeId, active: true },
        data: { active: false },
      });
      return tx.homeAddress.create({
        data: {
          employeeId,
          address: input.address,
          label: input.label ?? 'Casa',
          latitude,
          longitude,
          active: true,
        },
      });
    });
    // Rotas futuras ainda não iniciadas passam a sair do novo endereço
    await this.db.route.updateMany({
      where: {
        employeeId,
        status: 'PLANNED',
        date: { gte: new Date(new Date().toISOString().slice(0, 10)) },
      },
      data: {
        startAddress: created.address,
        startLatitude: latitude,
        startLongitude: longitude,
        legsComputedAt: null,
      },
    });
    return {
      id: created.id,
      address: created.address,
      label: created.label,
      latitude,
      longitude,
      active: true,
    };
  }
}
