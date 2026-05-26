import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import { IMeliProductDetailRepository } from 'src/core/adapters/repositories/mercadolibre/products/get/IMeliProductDetailRepository';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

type MeliItemAttribute = {
  id?: string;
  value_name?: string;
  [key: string]: unknown;
};

type MeliItemPicture = {
  url?: string;
  secure_url?: string;
  [key: string]: unknown;
};

type MeliItemResponse = {
  id?: string;
  site_id?: string;
  category_id?: string;
  title?: string;
  price?: number;
  base_price?: number;
  original_price?: number;
  currency_id?: string;
  initial_quantity?: number;
  available_quantity?: number;
  sold_quantity?: number;
  status?: string;
  sub_status?: unknown[] | null;
  condition?: string;
  buying_mode?: string;
  listing_type_id?: string;
  permalink?: string;
  thumbnail_id?: string;
  thumbnail?: string;
  pictures?: MeliItemPicture[] | null;
  attributes?: MeliItemAttribute[] | null;
  variations?: unknown[] | null;
  sale_terms?: unknown[] | null;
  warranty?: string;
  shipping?: {
    free_shipping?: boolean;
    [key: string]: unknown;
  } | null;
  health?: number;
  seller_id?: number;
  user_product_id?: string;
  family_name?: string;
  family_id?: string;
  official_store_id?: number;
  inventory_id?: string;
  start_time?: string;
  stop_time?: string;
  end_time?: string;
  expiration_time?: string;
  date_created?: string;
  last_updated?: string;
  video_id?: string;
  accepts_mercadopago?: boolean;
  international_delivery_mode?: string;
  tags?: string[] | null;
  catalog_product_id?: string;
  domain_id?: string;
  seller_custom_field?: string;
  parent_item_id?: string;
  automatic_relist?: boolean;
  catalog_listing?: boolean;
  channels?: string[] | null;
  warnings?: unknown[] | null;
  item_relations?: unknown[] | null;
  deal_ids?: string[] | null;
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

    const [item, descriptionResponse] = await Promise.all([
      this.httpClient.get<MeliItemResponse | null>(`/items/${itemId}`),
      this.httpClient
        .get<MeliDescriptionResponse | null>(`/items/${itemId}/description`)
        .catch(() => null),
    ]);

    if (!item) return null;

    try {
      return this.mapItemDetail(item, itemId, descriptionResponse);
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

    const multiGetResponse = await this.httpClient.get<
      MeliMultiGetItemResponse[] | null
    >(`/items?ids=${encodeURIComponent(normalizedIds.join(','))}`);

    if (!multiGetResponse || !Array.isArray(multiGetResponse)) {
      return [];
    }

    const descriptions = await Promise.all(
      normalizedIds.map(
        async (itemId) =>
          [
            itemId,
            await this.getProductDescription(itemId).catch(() => null),
          ] as const,
      ),
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

    const description =
      await this.httpClient.get<MeliDescriptionResponse | null>(
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

    if (typeof price !== 'number' || !categoryId || !listingTypeId) {
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
        .map((pic) => pic.secure_url ?? pic.url)
        .filter((picUrl): picUrl is string => typeof picUrl === 'string'),
      sellerSku: sellerSkuAttr?.value_name ?? undefined,
      brand: brandAttr?.value_name ?? undefined,
      warranty: item.warranty ?? undefined,
      freeShipping: item.shipping?.free_shipping ?? false,
      health: item.health ?? 0,
      lastUpdated: item.last_updated ?? '',
      description: descriptionResponse?.plain_text ?? undefined,
      site_id: item.site_id ?? null,
      family_name: item.family_name ?? null,
      family_id: item.family_id ?? null,
      seller_id: item.seller_id ?? null,
      user_product_id: item.user_product_id ?? null,
      official_store_id: item.official_store_id ?? null,
      base_price: item.base_price ?? null,
      original_price: item.original_price ?? null,
      inventory_id: item.inventory_id ?? null,
      initial_quantity: item.initial_quantity ?? null,
      available_quantity: item.available_quantity ?? null,
      sale_terms: Array.isArray(item.sale_terms) ? item.sale_terms : [],
      start_time: item.start_time ?? null,
      stop_time: item.stop_time ?? null,
      end_time: item.end_time ?? null,
      expiration_time: item.expiration_time ?? null,
      date_created: item.date_created ?? null,
      last_updated: item.last_updated ?? null,
      video_id: item.video_id ?? null,
      accepts_mercadopago: item.accepts_mercadopago ?? null,
      shipping: item.shipping ?? null,
      international_delivery_mode: item.international_delivery_mode ?? null,
      attributes,
      variations: Array.isArray(item.variations) ? item.variations : [],
      sub_status: Array.isArray(item.sub_status) ? item.sub_status : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      catalog_product_id: item.catalog_product_id ?? null,
      domain_id: item.domain_id ?? null,
      seller_custom_field: item.seller_custom_field ?? null,
      parent_item_id: item.parent_item_id ?? null,
      automatic_relist: item.automatic_relist ?? null,
      catalog_listing: item.catalog_listing ?? null,
      channels: Array.isArray(item.channels) ? item.channels : [],
      warnings: Array.isArray(item.warnings) ? item.warnings : [],
      item_relations: Array.isArray(item.item_relations)
        ? item.item_relations
        : [],
      deal_ids: Array.isArray(item.deal_ids) ? item.deal_ids : [],
    };
  }
}
