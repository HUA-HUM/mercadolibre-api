import { OrderEntity } from 'src/core/entitis/mercadolibre/orders/OrderEntity';

export interface IGetOrdersRepository {
  getOrders(params: GetOrdersParams): Promise<OrdersPage>;
  getOrdersByProduct(params: GetOrdersByProductParams): Promise<OrdersPage>;
}
export type GetOrdersParams = {
  status?: string;
  limit: number;
  offset: number;
};

export type GetOrdersByProductParams = GetOrdersParams & {
  itemId: string;
};

export type OrdersPage = {
  results: OrderEntity[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
};
