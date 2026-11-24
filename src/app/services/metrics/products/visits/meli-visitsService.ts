import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IGetProductsVisitRepository } from 'src/core/adapters/repositories/mercadolibre/metrics/products/visits/IGetProductsVisitRepository';
import { ProductVisits } from 'src/core/entitis/mercadolibre/metrics/products/visits/ProductVisits';

// El total de visitas cambia lento: cachearlo evita pegarle a ML en cada request
export const VISITS_CACHE_TTL_MS = 30 * 60 * 1000;
// ML exige una llamada por id: lotes chicos para no exceder timeouts ni el rate limit
export const VISITS_BULK_MAX_IDS = 100;
const VISITS_CACHE_MAX_ENTRIES = 50_000;

type CacheEntry = { total: number; expiresAt: number };

@Injectable()
export class MeliVisitsService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject('IGetProductsVisitRepository')
    private readonly visitsRepo: IGetProductsVisitRepository,
  ) {}

  async getProductVisits(itemId: string): Promise<ProductVisits> {
    const [visits] = await this.getProductsVisits([itemId]);

    if (!visits) {
      throw new NotFoundException(
        `Mercado Libre did not return visits for item ${itemId}`,
      );
    }

    return visits;
  }

  /**
   * Devuelve solo los ids con una medición real de Mercado Libre. Los que ML
   * no contestó se omiten del array: un 0 en la respuesta es siempre un 0 real.
   */

  async getProductsVisits(itemIds: string[]): Promise<ProductVisits[]> {
    const ids = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];

    if (ids.length === 0) {
      throw new BadRequestException('At least one itemId is required');
    }

    if (ids.length > VISITS_BULK_MAX_IDS) {
      throw new BadRequestException(
        `At most ${VISITS_BULK_MAX_IDS} itemIds per request`,
      );
    }

    const now = Date.now();
    const missing = ids.filter((id) => {
      const entry = this.cache.get(id);
      return !entry || entry.expiresAt <= now;
    });

    if (missing.length > 0) {
      const fetched = await this.visitsRepo.getVisitsByIds(missing);
      const expiresAt = Date.now() + VISITS_CACHE_TTL_MS;

      // Solo se cachean mediciones reales; un id sin respuesta se reintenta
      for (const [id, total] of Object.entries(fetched)) {
        this.setCache(id, { total, expiresAt });
      }
    }

    return ids.flatMap((id) => {
      const entry = this.cache.get(id);
      return entry ? [{ item_id: id, total: entry.total }] : [];
    });
  }

  private setCache(id: string, entry: CacheEntry): void {
    this.cache.delete(id);
    if (this.cache.size >= VISITS_CACHE_MAX_ENTRIES) {
      // Map conserva orden de inserción: se descarta la entrada más vieja
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(id, entry);
  }
}
