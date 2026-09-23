import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { IMeliProductDetailRepository } from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductDetailRepository';
import type {
  DeleteMeliProductResult,
  UpdateMeliProductPriceAndStockResult,
  UpdateMeliProductPriceResult,
} from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductDetailRepository';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

const SUPPORTED_APP_KEYS = ['default', 'promotions-engine-api'];
const BULK_UPDATE_MAX_ITEMS = 50;

export interface BulkUpdatePriceStockItem {
  mla: string;
  price: number;
  stock?: number;
}

export interface BulkUpdatePriceStockResponse {
  appKey: string;
  total: number;
  updated: number;
  failed: number;
  results: Array<{
    mla: string;
    ok: boolean;
    price?: number;
    stock?: number;
    status?: string | null;
    error?: string;
    meliStatus?: number | null;
    meliResponse?: unknown;
  }>;
}

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
    stock?: number,
  ): Promise<UpdateMeliProductPriceResult | UpdateMeliProductPriceAndStockResult | null> {
    if (!itemId) {
      throw new Error('ItemId is required');
    }

    this.assertPrice(price);
    this.assertStock(stock);
    this.assertAppKey(appKey);

    if (stock === undefined) {
      return this.meliProductDetailRepository.updateProductPrice(
        itemId,
        price,
        appKey,
      );
    }

    const result =
      await this.meliProductDetailRepository.updateProductPriceAndStock(
        itemId,
        price,
        stock,
        appKey,
      );

    if (!result.ok) {
      throw this.toMutationException(result);
    }

    return result;
  }

  async updatePriceAndStockBulk(
    items: BulkUpdatePriceStockItem[],
    appKey = 'default',
  ): Promise<BulkUpdatePriceStockResponse> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Body must be a non-empty array');
    }

    if (items.length > BULK_UPDATE_MAX_ITEMS) {
      throw new BadRequestException(
        `Bulk update accepts at most ${BULK_UPDATE_MAX_ITEMS} items`,
      );
    }

    this.assertAppKey(appKey);

    const results: BulkUpdatePriceStockResponse['results'] = [];

    for (const item of items) {
      const mla = item?.mla?.trim();
      const price = Number(item?.price);
      const hasStock = item?.stock !== undefined && item?.stock !== null;
      const stock = hasStock ? Number(item.stock) : undefined;

      if (!mla) {
        results.push({
          mla: item?.mla ?? '',
          ok: false,
          error: 'mla is required',
        });
        continue;
      }

      if (!Number.isFinite(price) || price <= 0) {
        results.push({
          mla,
          ok: false,
          error: 'Price must be a positive number',
        });
        continue;
      }

      if (
        stock !== undefined &&
        (!Number.isInteger(stock) || stock < 0)
      ) {
        results.push({
          mla,
          ok: false,
          error: 'Stock must be an integer greater than or equal to 0',
        });
        continue;
      }

      const result =
        await this.meliProductDetailRepository.updateProductPriceAndStock(
          mla,
          price,
          stock,
          appKey,
        );

      results.push({
        mla: result.id,
        ok: result.ok,
        price: result.price,
        stock: result.stock,
        status: result.status,
        error: result.error,
        meliStatus: result.meliStatus,
        meliResponse: result.meliResponse,
      });
    }

    return {
      appKey,
      total: results.length,
      updated: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  }

  private assertPrice(price: number): void {
    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Price must be a positive number');
    }
  }

  private assertStock(stock?: number): void {
    if (stock === undefined) {
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new BadRequestException(
        'Stock must be an integer greater than or equal to 0',
      );
    }
  }

  private assertAppKey(appKey: string): void {
    if (!SUPPORTED_APP_KEYS.includes(appKey)) {
      throw new BadRequestException(`Unsupported appKey "${appKey}"`);
    }
  }

  private toMutationException(
    result: UpdateMeliProductPriceAndStockResult,
  ): ForbiddenException | BadGatewayException {
    const exceptionBody = {
      statusCode: result.meliStatus === 403 ? 403 : 502,
      message:
        result.error ??
        `Mercado Libre could not update_price_stock item ${result.id}`,
      operation: 'update_price_stock',
      itemId: result.id,
      meliStatus: result.meliStatus ?? null,
      meliResponse: result.meliResponse ?? null,
    };

    return result.meliStatus === 403
      ? new ForbiddenException(exceptionBody)
      : new BadGatewayException(exceptionBody);
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
