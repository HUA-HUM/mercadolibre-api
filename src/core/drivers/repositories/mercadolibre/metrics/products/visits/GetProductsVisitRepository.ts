import { Inject, Injectable } from '@nestjs/common';
import { IGetProductsVisitRepository } from 'src/core/adapters/repositories/mercadolibre/metrics/products/visits/IGetProductsVisitRepository';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';

// Mercado Libre acepta hasta 50 ids por llamada en /visits/items?ids=
export const VISITS_MAX_IDS_PER_REQUEST = 50;

@Injectable()
export class GetProductsVisitRepository implements IGetProductsVisitRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly meliHttpClient: IMeliHttpClient,
  ) {}

  async getVisitsById(itemId: string): Promise<number | null> {
    const visits = await this.getVisitsByIds([itemId]);
    return visits[itemId] ?? null;
  }

  async getVisitsByIds(itemIds: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    // Secuencial a propósito: evita ráfagas que disparen el rate limit de ML
    for (let i = 0; i < itemIds.length; i += VISITS_MAX_IDS_PER_REQUEST) {
      const chunk = itemIds.slice(i, i + VISITS_MAX_IDS_PER_REQUEST);
      const query = new URLSearchParams({ ids: chunk.join(',') });

      const response = await this.meliHttpClient.get<Record<string, unknown>>(
        `/visits/items?${query.toString()}`,
      );

      for (const itemId of chunk) {
        const total = response?.[itemId];
        if (typeof total === 'number' && Number.isFinite(total)) {
          result[itemId] = total;
        }
      }
    }

    return result;
  }
}
