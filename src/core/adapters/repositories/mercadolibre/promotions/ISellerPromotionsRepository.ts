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

export interface RemoveSellerPromotionRequest {
  promotion_type?: string;
}

export interface RemoveSellerPromotionItemRequest {
  promotion_id: string;
  promotion_type?: string;
  offer_id?: string;
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
    promotionId: string,
    params: RemoveSellerPromotionRequest,
  ): Promise<RemoveSellerPromotionResponse | null>;
  removeItemFromPromotion(
    itemId: string,
    params: RemoveSellerPromotionItemRequest,
  ): Promise<RemoveSellerPromotionResponse | null>;
}
