import { Inject, Injectable } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import {
  ActivateSellerPromotionRequest,
  ActivateSellerPromotionResponse,
  ISellerPromotionsRepository,
  RemoveSellerPromotionItemRequest,
  RemoveSellerPromotionRequest,
  RemoveSellerPromotionResult,
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
  ): Promise<RemoveSellerPromotionResult | null> {
    const query = new URLSearchParams({
      app_version: 'v2',
    });

    if (params.promotion_type) {
      query.set('promotion_type', params.promotion_type);
    }

    const path = `/seller-promotions/promotions/${encodeURIComponent(
      promotionId,
    )}?${query.toString()}`;

    const response = await this.meliHttpClient.deleteWithMeta<Record<string, unknown>>(
      path,
      {
        appKey: PROMOTIONS_APP_KEY,
      },
    );

    if (!response) return null;

    if (response.status >= 200 && response.status < 300) {
      return response.data ?? { status: 'ok' };
    }

    return {
      status: response.status,
      path,
      data: response.data,
    };
  }

  async removeItemFromPromotion(
    itemId: string,
    params: RemoveSellerPromotionItemRequest,
  ) {
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

    const path = `/seller-promotions/items/${encodeURIComponent(itemId)}?${query.toString()}`;

    console.log('[MELI PROMOTIONS REMOVE ITEM] request', {
      appKey: PROMOTIONS_APP_KEY,
      itemId,
      params,
      path,
    });

    const response = await this.meliHttpClient.deleteWithMeta<Record<string, unknown>>(
      path,
      {
        appKey: PROMOTIONS_APP_KEY,
      },
    );

    console.log('[MELI PROMOTIONS REMOVE ITEM] response', {
      itemId,
      path,
      status: response?.status,
      data: response?.data,
    });

    return response;
  }
}
