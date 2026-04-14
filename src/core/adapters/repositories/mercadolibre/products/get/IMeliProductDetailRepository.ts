import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

export interface IMeliProductDetailRepository {
  getProductDetail(itemId: string): Promise<MeliProductDetail | null>;
  getProductsDetail(itemIds: string[]): Promise<MeliProductDetail[]>;
  getProductDescription(itemId: string): Promise<MeliProductDescription | null>;
  getListingPrices(
    itemId: string,
    params?: {
      price?: number;
      categoryId?: string;
      listingTypeId?: string;
    },
  ): Promise<MeliListingPrice[] | null>;
}
