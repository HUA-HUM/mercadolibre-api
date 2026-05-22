import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivateSellerPromotionRequest,
  ISellerPromotionsRepository,
  RemoveSellerPromotionItemRequest,
  RemoveSellerPromotionRequest,
} from 'src/core/adapters/repositories/mercadolibre/promotions/ISellerPromotionsRepository';
import { getMeliSellerId } from 'src/core/drivers/repositories/mercadolibre/getSeller/getMeliSellerId';

const PROMOTIONS_APP_KEY = 'promotions-engine-api';

@Injectable()
export class GetSellerPromotionsService {
  constructor(
    @Inject('ISellerPromotionsRepository')
    private readonly sellerPromotionsRepository: ISellerPromotionsRepository,
  ) {}

  async getCurrentSellerPromotions() {
    const userId = getMeliSellerId(PROMOTIONS_APP_KEY);
    return this.sellerPromotionsRepository.getUserPromotions(userId);
  }

  async getPromotionItems(
    promotionId: string,
    promotionType?: string,
    limit?: number,
    searchAfter?: string,
  ) {
    const resolvedPromotionType = await this.resolvePromotionType(
      promotionId,
      promotionType,
    );

    return this.sellerPromotionsRepository.getPromotionItems(
      promotionId,
      resolvedPromotionType,
      limit,
      searchAfter,
    );
  }

  async activatePromotionForItem(
    itemId: string,
    body: ActivateSellerPromotionRequest,
  ) {
    return this.sellerPromotionsRepository.activatePromotionForItem(itemId, body);
  }

  async removePromotionForItem(
    promotionId: string,
    params: RemoveSellerPromotionRequest,
  ) {
    return this.sellerPromotionsRepository.removePromotionForItem(
      promotionId,
      params,
    );
  }

  async removeItemFromPromotion(
    itemId: string,
    params: RemoveSellerPromotionItemRequest,
  ) {
    return this.sellerPromotionsRepository.removeItemFromPromotion(
      itemId,
      params,
    );
  }

  private async resolvePromotionType(
    promotionId: string,
    requestedPromotionType?: string,
  ): Promise<string> {
    if (requestedPromotionType) {
      return requestedPromotionType;
    }

    try {
      const promotions =
        await this.sellerPromotionsRepository.getUserPromotions(
          getMeliSellerId(PROMOTIONS_APP_KEY),
        );

      const results = Array.isArray(promotions?.results) ? promotions.results : [];
      const matchedPromotion = results.find((promotion) => {
        if (!promotion || typeof promotion !== 'object') {
          return false;
        }

        return 'id' in promotion && promotion.id === promotionId;
      });

      const resolvedPromotionType =
        matchedPromotion &&
        typeof matchedPromotion === 'object' &&
        'type' in matchedPromotion &&
        typeof matchedPromotion.type === 'string'
          ? matchedPromotion.type
          : undefined;

      return resolvedPromotionType ?? 'DEAL';
    } catch (error) {
      console.warn(
        '[MELI PROMOTIONS] could not resolve promotion_type, falling back to DEAL',
        {
          promotionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return 'DEAL';
    }
  }
}
