import { Inject, Injectable } from '@nestjs/common';
import type {
  GetOrdersByProductParams,
  GetOrdersParams,
  IGetOrdersRepository,
  OrdersPage,
} from 'src/core/adapters/repositories/mercadolibre/orders/IGetOrdersRepository';

@Injectable()
export class GetOrdersService {
  constructor(
    @Inject('IGetOrdersRepository')
    private readonly ordersRepo: IGetOrdersRepository,
  ) {}

  getOrders(params: GetOrdersParams): Promise<OrdersPage> {
    return this.ordersRepo.getOrders(params);
  }

  getOrdersByProduct(params: GetOrdersByProductParams): Promise<OrdersPage> {
    if (!params.itemId) {
      throw new Error('ItemId is required');
    }

    return this.ordersRepo.getOrdersByProduct(params);
  }
}
