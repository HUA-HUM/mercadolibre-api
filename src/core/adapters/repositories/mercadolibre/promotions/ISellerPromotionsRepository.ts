export interface SellerPromotionsUserResponse {
  user_id?: string | number;
  results?: unknown[];
  [key: string]: unknown;
}

export interface SellerPromotionItemsResponse {
  results?: unknown[];
  [key: string]: unknown;
}

export interface ISellerPromotionsRepository {
  getUserPromotions(userId: string): Promise<SellerPromotionsUserResponse | null>;
  getPromotionItems(
    promotionId: string,
    promotionType?: string,
    limit?: number,
    searchAfter?: string,
  ): Promise<SellerPromotionItemsResponse | null>;
}
