import { Inject, Injectable } from '@nestjs/common';
import type { ISellerPromotionsRepository } from 'src/core/adapters/repositories/mercadolibre/promotions/ISellerPromotionsRepository';
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
    promotionType = 'DEAL',
    limit?: number,
    searchAfter?: string,
  ) {
    return this.sellerPromotionsRepository.getPromotionItems(
      promotionId,
      promotionType,
      limit,
      searchAfter,
    );
  }
}
