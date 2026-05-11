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

    if (
      requestedPromotionType &&
      resolvedPromotionType &&
      requestedPromotionType !== resolvedPromotionType
    ) {
      console.warn('[MELI PROMOTIONS] promotion_type mismatch, using resolved type', {
        promotionId,
        requestedPromotionType,
        resolvedPromotionType,
      });
    }

    return resolvedPromotionType ?? requestedPromotionType ?? 'DEAL';
  }
}
