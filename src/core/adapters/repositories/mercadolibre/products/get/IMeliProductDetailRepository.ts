import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

export interface DeleteMeliProductResult {
  id: string;
  deleted: boolean;
  alreadyDeleted: boolean;
  closePerformed: boolean;
  status: string;
  subStatus: string[];
}

export interface IMeliProductDetailRepository {
  getProductDetail(itemId: string): Promise<MeliProductDetail | null>;
  getProductsDetail(itemIds: string[]): Promise<MeliProductDetail[]>;
  deleteProduct(itemId: string): Promise<DeleteMeliProductResult | null>;
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
