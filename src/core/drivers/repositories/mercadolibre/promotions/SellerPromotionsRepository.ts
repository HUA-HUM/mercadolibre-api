import { Inject, Injectable } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import {
  ActivateSellerPromotionRequest,
  ActivateSellerPromotionResponse,
  ISellerPromotionsRepository,
  RemoveSellerPromotionItemRequest,
  RemoveSellerPromotionRequest,
  RemoveSellerPromotionResponse,
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

  async activatePromotionForItem(
    itemId: string,
    body: ActivateSellerPromotionRequest,
  ): Promise<ActivateSellerPromotionResponse | null> {
    const query = new URLSearchParams({
      app_version: 'v2',
    });

    return this.meliHttpClient.post<ActivateSellerPromotionResponse>(
      `/seller-promotions/items/${encodeURIComponent(itemId)}?${query.toString()}`,
      body,
      {
        appKey: PROMOTIONS_APP_KEY,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async removePromotionForItem(
    promotionId: string,
    params: RemoveSellerPromotionRequest,
  ): Promise<RemoveSellerPromotionResponse | null> {
    const query = new URLSearchParams({
      app_version: 'v2',
    });

    if (params.promotion_type) {
      query.set('promotion_type', params.promotion_type);
    }

    return this.meliHttpClient.delete<RemoveSellerPromotionResponse>(
      `/seller-promotions/promotions/${encodeURIComponent(
        promotionId,
      )}?${query.toString()}`,
      {
        appKey: PROMOTIONS_APP_KEY,
      },
    );
  }

  async removeItemFromPromotion(
    itemId: string,
    params: RemoveSellerPromotionItemRequest,
  ): Promise<RemoveSellerPromotionResponse | null> {
    const query = new URLSearchParams({
      app_version: 'v2',
      promotion_id: params.promotion_id,
    });

    if (params.promotion_type) {
      query.set('promotion_type', params.promotion_type);
    }

    if (params.offer_id) {
      query.set('offer_id', params.offer_id);
    }

    return this.meliHttpClient.delete<RemoveSellerPromotionResponse>(
      `/seller-promotions/items/${encodeURIComponent(itemId)}?${query.toString()}`,
      {
        appKey: PROMOTIONS_APP_KEY,
      },
    );
  }
}
