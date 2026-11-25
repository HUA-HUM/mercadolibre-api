import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { IGetProductsVisitRepository } from 'src/core/adapters/repositories/mercadolibre/metrics/products/visits/IGetProductsVisitRepository';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import { MeliRateLimitException } from 'src/core/drivers/repositories/mercadolibre/http/error/meliHttpError';

// Mercado Libre acepta un solo id por llamada en /visits/items
// (con más responde 400 "maximum amount of items to query is 1").
export const VISITS_CONCURRENCY = 3;

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
   * Devuelve solo los ids que Mercado Libre midió; los demás se omiten
   * (nunca se inventa un 0).
   * - Si ML aplica rate limit, se deja de pedir: se devuelve lo medido hasta
   *   ahí, o 429 si no se llegó a medir nada.
   * - Si se pidieron varios ids y ML no contestó ninguno, 502.
   */
  async getVisitsByIds(itemIds: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    let rateLimit: MeliRateLimitException | null = null;
    let next = 0;

    const worker = async (): Promise<void> => {
      while (!rateLimit && next < itemIds.length) {
        const itemId = itemIds[next++];

        try {
          const total = await this.fetchOne(itemId);
          if (total !== null) {
            result[itemId] = total;
          }
        } catch (error) {
          if (error instanceof MeliRateLimitException) {
            rateLimit = error;
            return;
          }
          throw error;
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(VISITS_CONCURRENCY, itemIds.length) },
        worker,
      ),
    );

    const measured = Object.keys(result).length;

    if (rateLimit && measured === 0) {
      throw rateLimit;
    }

    if (!rateLimit && itemIds.length > 1 && measured === 0) {
      throw new BadGatewayException({
        statusCode: 502,
        message:
          'Mercado Libre did not return visits for any of the requested ids',
      });
    }

    return result;
  }

  private async fetchOne(itemId: string): Promise<number | null> {
    const query = new URLSearchParams({ ids: itemId });
    // null = ML respondió 400/403/404 para este id (inexistente, sin permiso)
    const response = await this.meliHttpClient.get<Record<string, unknown>>(
      `/visits/items?${query.toString()}`,
    );
    const total = response?.[itemId];

    return typeof total === 'number' && Number.isFinite(total) ? total : null;
  }
}
