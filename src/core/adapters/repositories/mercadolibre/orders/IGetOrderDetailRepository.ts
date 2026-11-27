import {
  OrderDetailEntity,
  PackDetailEntity,
} from 'src/core/entitis/mercadolibre/orders/OrderDetailEntity';

export interface IGetOrderDetailRepository {
  /** Null when Mercado Libre has no sale with that id for the account. */
  getOrderDetail(orderId: string): Promise<OrderDetailEntity | null>;
  /** Null when Mercado Libre has no cart with that id for the account. */
  getPackDetail(packId: string): Promise<PackDetailEntity | null>;
}
