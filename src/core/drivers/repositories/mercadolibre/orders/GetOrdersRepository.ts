import { Inject, Injectable } from '@nestjs/common';
import {
  IGetOrdersRepository,
  GetOrdersByProductParams,
  GetOrdersParams,
  OrdersPage,
} from 'src/core/adapters/repositories/mercadolibre/orders/IGetOrdersRepository';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import { getMeliSellerId } from '../getSeller/getMeliSellerId';
import { MeliOrderMapper } from './mapper/MeliOrderMapper';

@Injectable()
export class GetOrdersRepository implements IGetOrdersRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly meliHttpClient: IMeliHttpClient,
  ) {}

  async getOrders(params: GetOrdersParams): Promise<OrdersPage> {
    const sellerId = getMeliSellerId();

    const query = this.buildOrdersSearchQuery({
      sellerId,
      status: params.status,
      limit: params.limit,
      offset: params.offset,
    });

    const response = await this.meliHttpClient.get<any>(query);

    return this.mapOrdersPage(response, params);
  }

  async getOrdersByProduct(
    params: GetOrdersByProductParams,
  ): Promise<OrdersPage> {
    const sellerId = getMeliSellerId();

    const query = this.buildOrdersSearchQuery({
      sellerId,
      status: params.status,
      limit: params.limit,
      offset: params.offset,
      q: params.itemId,
    });

    const response = await this.meliHttpClient.get<any>(query);

    return this.mapOrdersPage(response, params);
  }

  private buildOrdersSearchQuery(params: {
    sellerId: string;
    status?: string;
    limit: number;
    offset: number;
    q?: string;
  }): string {
    const query = new URLSearchParams({
      seller: params.sellerId,
      'order.status': params.status ?? 'paid',
      limit: String(params.limit),
      offset: String(params.offset),
    });

    if (params.q) {
      query.set('q', params.q);
    }

    return `/orders/search?${query.toString()}`;
  }

  private mapOrdersPage(
    response: any,
    params: Pick<GetOrdersParams, 'limit' | 'offset'>,
  ): OrdersPage {
    return {
      results: (response.results ?? []).map(MeliOrderMapper.toEntity),
      paging: {
        total: response.paging?.total ?? 0,
        offset: response.paging?.offset ?? params.offset,
        limit: response.paging?.limit ?? params.limit,
      },
    };
  }
}
