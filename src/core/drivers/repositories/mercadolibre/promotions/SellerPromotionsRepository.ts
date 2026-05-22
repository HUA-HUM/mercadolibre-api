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
const GET_PROMOTION_ITEMS_MAX_ATTEMPTS = 2;
const GET_PROMOTION_ITEMS_RETRY_DELAY_MS = 300;

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

    const path = `/seller-promotions/promotions/${encodeURIComponent(
      promotionId,
    )}/items?${query.toString()}`;

    console.log('[MELI PROMOTIONS GET ITEMS] request', {
      appKey: PROMOTIONS_APP_KEY,
      promotionId,
      promotionType,
      limit,
      searchAfter,
      path,
    });

    for (let attempt = 1; attempt <= GET_PROMOTION_ITEMS_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.meliHttpClient.get<SellerPromotionItemsResponse>(
          path,
          {
            appKey: PROMOTIONS_APP_KEY,
          },
        );

        if (attempt > 1) {
          console.log('[MELI PROMOTIONS GET ITEMS] recovered after retry', {
            promotionId,
            promotionType,
            limit,
            searchAfter,
            attempt,
          });
        }

        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.warn('[MELI PROMOTIONS GET ITEMS] attempt failed', {
          promotionId,
          promotionType,
          limit,
          searchAfter,
          attempt,
          maxAttempts: GET_PROMOTION_ITEMS_MAX_ATTEMPTS,
          message,
        });

        if (attempt === GET_PROMOTION_ITEMS_MAX_ATTEMPTS) {
          throw error;
        }

        await sleep(GET_PROMOTION_ITEMS_RETRY_DELAY_MS);
      }
    }

    return null;
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
