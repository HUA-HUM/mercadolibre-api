import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { IMeliProductDetailRepository } from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductDetailRepository';
import type {
  DeleteMeliProductResult,
  UpdateMeliProductPriceResult,
} from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductDetailRepository';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

@Injectable()
export class GetMeliProductDetailService {
  constructor(
    @Inject('IMeliProductDetailRepository')
    private readonly meliProductDetailRepository: IMeliProductDetailRepository,
  ) {}

  async execute(itemId: string): Promise<MeliProductDetail | null> {
    if (!itemId) {
      throw new Error('ItemId is required');
    }

    const product =
      await this.meliProductDetailRepository.getProductDetail(itemId);

    if (!product) {
      return null;
    }

    return product;
  }

  async getBulk(itemIds: string[]): Promise<MeliProductDetail[]> {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error('At least one itemId is required');
    }

    return this.meliProductDetailRepository.getProductsDetail(itemIds);
  }

  async deleteProduct(
    itemId: string,
    appKey = 'default',
  ): Promise<DeleteMeliProductResult | null> {
    if (!itemId) {
      throw new Error('ItemId is required');
    }

    if (!['default', 'promotions-engine-api'].includes(appKey)) {
      throw new BadRequestException(`Unsupported appKey "${appKey}"`);
    }

    return this.meliProductDetailRepository.deleteProduct(itemId, appKey);
  }

  async updatePrice(
    itemId: string,
    price: number,
    appKey = 'default',
  ): Promise<UpdateMeliProductPriceResult | null> {
    if (!itemId) {
      throw new Error('ItemId is required');
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Price must be a positive number');
    }

    if (!['default', 'promotions-engine-api'].includes(appKey)) {
      throw new BadRequestException(`Unsupported appKey "${appKey}"`);
    }

    return this.meliProductDetailRepository.updateProductPrice(
      itemId,
      price,
      appKey,
    );
  }

  async getDescription(itemId: string): Promise<MeliProductDescription | null> {
    if (!itemId) {
      throw new Error('ItemId is required');
    }

    return this.meliProductDetailRepository.getProductDescription(itemId);
  }

  async getListingPrices(
    itemId: string,
    params?: {
      price?: number;
      categoryId?: string;
      listingTypeId?: string;
    },
  ): Promise<MeliListingPrice[] | null> {
    if (!itemId) {
      throw new Error('ItemId is required');
    }

    return this.meliProductDetailRepository.getListingPrices(itemId, params);
  }
}
