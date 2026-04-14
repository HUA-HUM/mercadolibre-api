import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import { IMeliProductDetailRepository } from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductDetailRepository';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

type MeliItemAttribute = {
  id?: string;
  value_name?: string;
};

type MeliItemPicture = {
  secure_url?: string;
};

type MeliItemResponse = {
  id?: string;
  category_id?: string;
  title?: string;
  price?: number;
  currency_id?: string;
  available_quantity?: number;
  sold_quantity?: number;
  status?: string;
  condition?: string;
  buying_mode?: string;
  listing_type_id?: string;
  permalink?: string;
  thumbnail_id?: string;
  thumbnail?: string;
  pictures?: MeliItemPicture[] | null;
  attributes?: MeliItemAttribute[] | null;
  warranty?: string;
  shipping?: {
    free_shipping?: boolean;
  } | null;
  health?: number;
  last_updated?: string;
};

type MeliDescriptionResponse = {
  text?: string;
  plain_text?: string;
  last_updated?: string;
  date_created?: string;
  snapshot?: {
    url?: string;
    width?: number;
    height?: number;
    status?: string;
  };
};

type MeliMultiGetItemResponse = {
  code?: number;
  body?: MeliItemResponse;
};

@Injectable()
export class MeliProductDetailRepository implements IMeliProductDetailRepository {
  private readonly logger = new Logger(MeliProductDetailRepository.name);

  constructor(
    @Inject('IMeliHttpClient')
    private readonly httpClient: IMeliHttpClient,
  ) {}

  async getProductDetail(itemId: string): Promise<MeliProductDetail | null> {
    if (!itemId) return null;

    const item = await this.httpClient.get<MeliItemResponse | null>(
      `/items/${itemId}`,
    );
    if (!item) return null;

    const descriptionResponse = await this.httpClient
      .get<MeliDescriptionResponse | null>(`/items/${itemId}/description`)
      .catch(() => null);

    const attributes = Array.isArray(item.attributes) ? item.attributes : [];
    const pictures = Array.isArray(item.pictures) ? item.pictures : [];

    const sellerSkuAttr = attributes.find((attr) => attr.id === 'SELLER_SKU');
    const brandAttr = attributes.find((attr) => attr.id === 'BRAND');

    try {
      return {
        id: item.id ?? itemId,
        categoryId: item.category_id ?? '',
        title: item.title ?? '',
        price: item.price ?? 0,
        currency: item.currency_id ?? '',
        stock: item.available_quantity ?? 0,
        soldQuantity: item.sold_quantity ?? 0,
        status: item.status ?? '',
        condition: item.condition ?? '',
        buyingMode: item.buying_mode ?? '',
        listingTypeId: item.listing_type_id ?? '',
        permalink: item.permalink ?? '',
        thumbnailId: item.thumbnail_id ?? '',
        thumbnail: item.thumbnail ?? '',
        pictures: pictures
          .map((pic) => pic.secure_url)
          .filter((picUrl): picUrl is string => typeof picUrl === 'string'),
        sellerSku: sellerSkuAttr?.value_name ?? undefined,
        brand: brandAttr?.value_name ?? undefined,
        warranty: item.warranty ?? undefined,
        freeShipping: item.shipping?.free_shipping ?? false,
        health: item.health ?? 0,
        lastUpdated: item.last_updated ?? '',
        description: descriptionResponse?.plain_text ?? undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to map Mercado Libre product detail`, {
        itemId,
        error,
        item,
      });
      throw error;
    }
  }

  async getProductsDetail(itemIds: string[]): Promise<MeliProductDetail[]> {
    const normalizedIds = itemIds
      .map((itemId) => itemId.trim())
      .filter((itemId) => itemId.length > 0);

    if (normalizedIds.length === 0) {
      return [];
    }

    const multiGetResponse = await this.httpClient.get<MeliMultiGetItemResponse[] | null>(
      `/items?ids=${encodeURIComponent(normalizedIds.join(','))}`,
    );

    if (!multiGetResponse || !Array.isArray(multiGetResponse)) {
      return [];
    }

    const descriptions = await Promise.all(
      normalizedIds.map(async (itemId) => [
        itemId,
        await this.getProductDescription(itemId),
      ] as const),
    );

    const descriptionMap = new Map(descriptions);

    return multiGetResponse
      .filter(
        (item): item is MeliMultiGetItemResponse & { body: MeliItemResponse } =>
          item.code === 200 && !!item.body,
      )
      .map((item) =>
        this.mapItemDetail(
          item.body,
          item.body.id ?? '',
          descriptionMap.get(item.body.id ?? '') ?? null,
        ),
      );
  }

  async getProductDescription(
    itemId: string,
  ): Promise<MeliProductDescription | null> {
    if (!itemId) return null;

    const description = await this.httpClient.get<MeliDescriptionResponse | null>(
      `/items/${itemId}/description`,
    );

    if (!description) {
      return null;
    }

    return description;
  }

  async getListingPrices(
    itemId: string,
    params?: {
      price?: number;
      categoryId?: string;
      listingTypeId?: string;
    },
  ): Promise<MeliListingPrice[] | null> {
    if (!itemId) return null;

    let price = params?.price;
    let categoryId = params?.categoryId;
    let listingTypeId = params?.listingTypeId;

    if (
      typeof price !== 'number' ||
      !categoryId ||
      !listingTypeId
    ) {
      const item = await this.httpClient.get<MeliItemResponse | null>(
        `/items/${itemId}`,
      );

      if (!item) {
        return null;
      }

      price = price ?? item.price;
      categoryId = categoryId ?? item.category_id;
      listingTypeId = listingTypeId ?? item.listing_type_id;
    }

    if (
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      !categoryId ||
      !listingTypeId
    ) {
      return null;
    }

    const query = new URLSearchParams({
      price: String(price),
      category_id: categoryId,
      listing_type_id: listingTypeId,
    });

    return this.httpClient.get<MeliListingPrice[] | null>(
      `/sites/MLA/listing_prices?${query.toString()}`,
    );
  }

  private mapItemDetail(
    item: MeliItemResponse,
    itemId: string,
    descriptionResponse: MeliDescriptionResponse | null,
  ): MeliProductDetail {
    const attributes = Array.isArray(item.attributes) ? item.attributes : [];
    const pictures = Array.isArray(item.pictures) ? item.pictures : [];

    const sellerSkuAttr = attributes.find((attr) => attr.id === 'SELLER_SKU');
    const brandAttr = attributes.find((attr) => attr.id === 'BRAND');

    return {
      id: item.id ?? itemId,
      categoryId: item.category_id ?? '',
      title: item.title ?? '',
      price: item.price ?? 0,
      currency: item.currency_id ?? '',
      stock: item.available_quantity ?? 0,
      soldQuantity: item.sold_quantity ?? 0,
      status: item.status ?? '',
      condition: item.condition ?? '',
      buyingMode: item.buying_mode ?? '',
      listingTypeId: item.listing_type_id ?? '',
      permalink: item.permalink ?? '',
      thumbnailId: item.thumbnail_id ?? '',
      thumbnail: item.thumbnail ?? '',
      pictures: pictures
        .map((pic) => pic.secure_url)
        .filter((picUrl): picUrl is string => typeof picUrl === 'string'),
      sellerSku: sellerSkuAttr?.value_name ?? undefined,
      brand: brandAttr?.value_name ?? undefined,
      warranty: item.warranty ?? undefined,
      freeShipping: item.shipping?.free_shipping ?? false,
      health: item.health ?? 0,
      lastUpdated: item.last_updated ?? '',
      description: descriptionResponse?.plain_text ?? undefined,
    };
  }
}
