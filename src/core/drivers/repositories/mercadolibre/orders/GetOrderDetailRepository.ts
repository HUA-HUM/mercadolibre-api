/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import type { IGetOrderDetailRepository } from 'src/core/adapters/repositories/mercadolibre/orders/IGetOrderDetailRepository';
import {
  OrderDetailEntity,
  PackDetailEntity,
} from 'src/core/entitis/mercadolibre/orders/OrderDetailEntity';
import { MeliOrderDetailMapper } from './mapper/MeliOrderDetailMapper';

@Injectable()
export class GetOrderDetailRepository implements IGetOrderDetailRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly meliHttpClient: IMeliHttpClient,
  ) {}

  async getOrderDetail(orderId: string): Promise<OrderDetailEntity | null> {
    const order = await this.meliHttpClient.get<any>(`/orders/${orderId}`);
    if (!order?.id) {
      return null;
    }

    const shipmentId = order.shipping?.id;

    // Billing, discounts and shipment are optional: if Mercado Libre does not
    // answer one of them (400/403/404 → null) the sale is still returned and
    // that block comes as null/empty. A 429 or 5xx fails the whole request.
    const [billing, discounts, shipment, shipmentCosts] = await Promise.all([
      this.meliHttpClient.get<any>(`/orders/${orderId}/billing_info`, {
        headers: { 'x-version': '2' },
      }),
      this.meliHttpClient.get<any>(`/orders/${orderId}/discounts`),
      shipmentId
        ? this.meliHttpClient.get<any>(`/shipments/${shipmentId}`, {
            headers: { 'x-format-new': 'true' },
          })
        : null,
      shipmentId
        ? this.meliHttpClient.get<any>(`/shipments/${shipmentId}/costs`)
        : null,
    ]);

    return MeliOrderDetailMapper.toEntity({
      order,
      billing,
      discounts,
      shipment,
      shipmentCosts,
    });
  }

  async getPackDetail(packId: string): Promise<PackDetailEntity | null> {
    const pack = await this.meliHttpClient.get<any>(`/packs/${packId}`);
    if (!pack?.id) {
      return null;
    }

    const packOrders: any[] = Array.isArray(pack.orders) ? pack.orders : [];
    const orderIds: string[] = packOrders
      .map((o) => o?.id as unknown)
      .filter((id: unknown) => id !== undefined && id !== null)
      .map(String);

    // One at a time: each sale already makes up to five calls in parallel.
    const orders: OrderDetailEntity[] = [];
    for (const orderId of orderIds) {
      const detail = await this.getOrderDetail(orderId);
      if (detail) {
        orders.push(detail);
      }
    }

    return {
      id: pack.id,
      status: typeof pack.status === 'string' ? pack.status : null,
      shippingId:
        typeof pack.shipment?.id === 'number' ? pack.shipment.id : null,
      dateCreated:
        typeof pack.date_created === 'string' ? pack.date_created : null,
      orders,
    };
  }
}
