import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { IGetProductsVisitRepository } from 'src/core/adapters/repositories/mercadolibre/metrics/products/visits/IGetProductsVisitRepository';
import { ProductVisits } from 'src/core/entitis/mercadolibre/metrics/products/visits/ProductVisits';

// El total de visitas cambia lento: cachearlo evita pegarle a ML en cada request
export const VISITS_CACHE_TTL_MS = 30 * 60 * 1000;
export const VISITS_BULK_MAX_IDS = 500;
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
    return visits;
  }

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

      for (const id of missing) {
        // Se cachea también el 0 (sin datos) para no reconsultar en loop
        this.setCache(id, { total: fetched[id] ?? 0, expiresAt });
      }
    }

    return ids.map((id) => ({
      item_id: id,
      total: this.cache.get(id)?.total ?? 0,
    }));
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
