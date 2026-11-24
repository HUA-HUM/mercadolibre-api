import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
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

  /**
   * Devuelve solo los ids que Mercado Libre midió. Los que ML no contestó se
   * omiten (nunca se inventa un 0). Si ML no contestó ningún lote, lanza 502.
   */
  async getVisitsByIds(itemIds: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    let answeredChunks = 0;

    // Secuencial a propósito: evita ráfagas que disparen el rate limit de ML
    for (let i = 0; i < itemIds.length; i += VISITS_MAX_IDS_PER_REQUEST) {
      const chunk = itemIds.slice(i, i + VISITS_MAX_IDS_PER_REQUEST);
      const query = new URLSearchParams({ ids: chunk.join(',') });

      const response = await this.meliHttpClient.get<Record<string, unknown>>(
        `/visits/items?${query.toString()}`,
      );

      // null = ML respondió 400/403/404 para el lote entero
      if (!response || typeof response !== 'object') {
        continue;
      }
      answeredChunks++;

      for (const itemId of chunk) {
        const total = response?.[itemId];
        if (typeof total === 'number' && Number.isFinite(total)) {
          result[itemId] = total;
        }
      }
    }

    if (itemIds.length > 0 && answeredChunks === 0) {
      throw new BadGatewayException({
        statusCode: 502,
        message:
          'Mercado Libre did not return visits for any of the requested ids',
      });
    }

    return result;
  }
}
