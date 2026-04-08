import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';

export interface IMeliProductDetailRepository {
  getProductDetail(itemId: string): Promise<MeliProductDetail | null>;
  getProductDescription(itemId: string): Promise<MeliProductDescription | null>;
}
