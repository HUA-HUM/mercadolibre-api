export interface SellerPromotionsUserResponse {
  user_id?: string | number;
  results?: unknown[];
  [key: string]: unknown;
}

export interface SellerPromotionItemsResponse {
  results?: unknown[];
  [key: string]: unknown;
}

export interface ActivateSellerPromotionRequest {
  promotion_id: string;
  promotion_type: string;
  offer_id: string;
}

export interface ActivateSellerPromotionResponse {
  [key: string]: unknown;
}

export interface RemoveSellerPromotionResponse {
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
  activatePromotionForItem(
    itemId: string,
    body: ActivateSellerPromotionRequest,
  ): Promise<ActivateSellerPromotionResponse | null>;
  removePromotionForItem(
    itemId: string,
  ): Promise<RemoveSellerPromotionResponse | null>;
}
