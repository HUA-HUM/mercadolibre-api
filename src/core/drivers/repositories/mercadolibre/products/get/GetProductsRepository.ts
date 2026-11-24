import { Inject, Injectable } from '@nestjs/common';
import { IMeliProductsRepository } from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductsRepository';
import { getMeliSellerId } from '../../getSeller/getMeliSellerId';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';

export type MeliProductStatus = 'active' | 'paused' | 'closed';

type MeliSearchResponse = {
  scroll_id?: string;
  results?: string[];
  paging?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
};

@Injectable()
export class MeliProductsRepository implements IMeliProductsRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly httpClient: IMeliHttpClient,
  ) {}

  async getProducts(params: {
    status?: MeliProductStatus;
    offset?: number;
    limit?: number;
    scrollId?: string;
    useScan?: boolean;
  }) {
    const sellerId = getMeliSellerId();

    /**
     * 🔴 SCAN MODE (CORREGIDO)
     */
    if (params.useScan) {
      const query = new URLSearchParams();

      // 🔥 CRÍTICO: SIEMPRE enviar search_type=scan
      query.append('search_type', 'scan');

      // respetar el filtro de estado también en modo scan
      if (params.status) query.append('status', params.status);

      // mantener mismo limit en todas las llamadas
      query.append('limit', (params.limit ?? 100).toString());

      // si existe scroll_id lo agregamos
      if (params.scrollId) {
        query.append('scroll_id', params.scrollId);
      }

      const response = await this.httpClient.get<MeliSearchResponse>(
        `/users/${sellerId}/items/search?${query.toString()}`,
      );

      if (!response) return null;

      return {
        seller_id: sellerId,
        results: response.results ?? [],
        scroll_id: response.scroll_id,
        paging: response.paging,
      };
    }

    /**
     * 🔵 OFFSET MODE (normal)
     */
    const query = new URLSearchParams();

    if (params.status) query.append('status', params.status);
    if (params.offset !== undefined)
      query.append('offset', params.offset.toString());
    if (params.limit !== undefined)
      query.append('limit', params.limit.toString());

    const response = await this.httpClient.get<MeliSearchResponse>(
      `/users/${sellerId}/items/search?${query.toString()}`,
    );

    if (!response) return null;

    return {
      seller_id: sellerId,
      results: response.results ?? [],
      paging: response.paging,
    };
  }
}
