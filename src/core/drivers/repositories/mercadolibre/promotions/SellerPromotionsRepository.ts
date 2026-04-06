import { Inject, Injectable } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import {
  ISellerPromotionsRepository,
  SellerPromotionItemsResponse,
  SellerPromotionsUserResponse,
} from 'src/core/adapters/repositories/mercadolibre/promotions/ISellerPromotionsRepository';

const PROMOTIONS_APP_KEY = 'promotions-engine-api';

@Injectable()
export class SellerPromotionsRepository implements ISellerPromotionsRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly meliHttpClient: IMeliHttpClient,
  ) {}

  async getUserPromotions(
    userId: string,
  ): Promise<SellerPromotionsUserResponse | null> {
    const query = new URLSearchParams({
      app_version: 'v2',
    });

    return this.meliHttpClient.get<SellerPromotionsUserResponse>(
      `/seller-promotions/users/${encodeURIComponent(userId)}?${query.toString()}`,
      {
        appKey: PROMOTIONS_APP_KEY,
      },
    );
  }

  async getPromotionItems(
    promotionId: string,
    promotionType = 'DEAL',
    limit?: number,
    searchAfter?: string,
  ): Promise<SellerPromotionItemsResponse | null> {
    const query = new URLSearchParams({
      app_version: 'v2',
      promotion_type: promotionType,
    });

    if (typeof limit === 'number' && Number.isFinite(limit)) {
      query.set('limit', String(limit));
    }

    if (searchAfter) {
      query.set('searchAfter', searchAfter);
    }

    return this.meliHttpClient.get<SellerPromotionItemsResponse>(
      `/seller-promotions/promotions/${encodeURIComponent(
        promotionId,
      )}/items?${query.toString()}`,
      {
        appKey: PROMOTIONS_APP_KEY,
      },
    );
  }
}
