/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  OrderDetailBilling,
  OrderDetailDiscount,
  OrderDetailEntity,
  OrderDetailPayment,
  OrderDetailShipping,
} from 'src/core/entitis/mercadolibre/orders/OrderDetailEntity';

export type MeliOrderDetailSources = {
  order: any;
  billing: any;
  discounts: any;
  shipment: any;
  shipmentCosts: any;
};

const list = (value: unknown): any[] => (Array.isArray(value) ? value : []);

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const str = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

export class MeliOrderDetailMapper {
  static toEntity(sources: MeliOrderDetailSources): OrderDetailEntity {
    const { order } = sources;

    return {
      id: order.id,
      packId: num(order.pack_id),
      status: order.status,
      statusDetail: str(order.status_detail),
      dateCreated: order.date_created,
      dateClosed: str(order.date_closed),
      lastUpdated: str(order.last_updated),
      currencyId: order.currency_id,
      totalAmount: order.total_amount,
      paidAmount: num(order.paid_amount) ?? order.total_amount,
      tags: list(order.tags).map(String),
      items: list(order.order_items).map((oi: any) => ({
        itemId: oi.item?.id,
        title: oi.item?.title,
        categoryId: str(oi.item?.category_id),
        variationId: num(oi.item?.variation_id),
        sellerSku: str(oi.item?.seller_sku),
        quantity: oi.quantity,
        unitPrice: oi.unit_price,
        grossPrice: num(oi.gross_price),
        saleFee: num(oi.sale_fee),
        listingTypeId: str(oi.listing_type_id),
      })),
      payments: list(order.payments).map((p) =>
        MeliOrderDetailMapper.toPayment(p),
      ),
      discounts: MeliOrderDetailMapper.toDiscounts(sources.discounts),
      buyer: {
        id: num(order.buyer?.id),
        nickname: str(order.buyer?.nickname),
        billing: MeliOrderDetailMapper.toBilling(sources.billing),
      },
      shipping: MeliOrderDetailMapper.toShipping(
        order,
        sources.shipment,
        sources.shipmentCosts,
      ),
    };
  }

  private static toPayment(p: any): OrderDetailPayment {
    return {
      id: p.id,
      status: p.status,
      statusDetail: str(p.status_detail),
      paymentMethodId: str(p.payment_method_id),
      paymentType: str(p.payment_type),
      installments: num(p.installments),
      installmentAmount: num(p.installment_amount),
      transactionAmount: num(p.transaction_amount) ?? 0,
      transactionAmountRefunded: num(p.transaction_amount_refunded) ?? 0,
      taxesAmount: num(p.taxes_amount) ?? 0,
      shippingCost: num(p.shipping_cost) ?? 0,
      couponAmount: num(p.coupon_amount) ?? 0,
      totalPaidAmount: num(p.total_paid_amount) ?? 0,
      marketplaceFee: num(p.marketplace_fee) ?? 0,
      dateApproved: str(p.date_approved),
    };
  }

  private static toDiscounts(raw: any): OrderDetailDiscount[] {
    const details: any[] = Array.isArray(raw?.details) ? raw.details : [];

    return details.flatMap((detail) => {
      const items: any[] = Array.isArray(detail.items) ? detail.items : [];
      const base = {
        type: detail.type,
        fundingMode: str(detail.supplier?.funding_mode),
        offerId: str(detail.supplier?.offer_id),
      };

      if (items.length === 0) {
        return [
          {
            ...base,
            itemId: null,
            quantity: null,
            amounts: MeliOrderDetailMapper.toAmounts(detail.amounts),
          },
        ];
      }

      return items.map((item) => ({
        ...base,
        itemId: str(item.id),
        quantity: num(item.quantity),
        amounts: MeliOrderDetailMapper.toAmounts(item.amounts),
      }));
    });
  }

  private static toAmounts(raw: any): OrderDetailDiscount['amounts'] {
    return {
      total: num(raw?.total) ?? 0,
      seller: num(raw?.seller),
      meli: num(raw?.meli),
    };
  }

  /** Expects the `x-version: 2` shape of /orders/{id}/billing_info. */
  private static toBilling(raw: any): OrderDetailBilling | null {
    const info = raw?.buyer?.billing_info;
    if (!info) {
      return null;
    }

    const address = info.address;
    const taxpayer = info.taxes?.taxpayer_type;

    return {
      firstName: str(info.name),
      lastName: str(info.last_name),
      identificationType: str(info.identification?.type),
      identificationNumber: str(info.identification?.number),
      taxpayerType: taxpayer
        ? { id: str(taxpayer.id), description: str(taxpayer.description) }
        : null,
      customerType: str(info.attributes?.cust_type),
      address: address
        ? {
            streetName: str(address.street_name),
            streetNumber: str(address.street_number),
            cityName: str(address.city_name),
            stateCode: str(address.state?.code),
            stateName: str(address.state?.name),
            zipCode: str(address.zip_code),
            countryId: str(address.country_id),
          }
        : null,
    };
  }

  private static toShipping(
    order: any,
    shipment: any,
    costs: any,
  ): OrderDetailShipping | null {
    const id = num(shipment?.id) ?? num(order.shipping?.id);
    if (id === null) {
      return null;
    }

    const sellerId = num(order.seller?.id);
    const senders: any[] = Array.isArray(costs?.senders) ? costs.senders : [];
    const sender =
      senders.find((s) => sellerId !== null && s.user_id === sellerId) ??
      senders[0];

    return {
      id,
      status: str(shipment?.status),
      substatus: str(shipment?.substatus),
      mode: str(shipment?.logistic?.mode),
      logisticType: str(shipment?.logistic?.type),
      trackingNumber: str(shipment?.tracking_number),
      trackingMethod: str(shipment?.tracking_method),
      declaredValue: num(shipment?.declared_value),
      dateCreated: str(shipment?.date_created),
      costs: costs
        ? {
            grossAmount: num(costs.gross_amount),
            buyerCost: num(costs.receiver?.cost),
            sellerCost: num(sender?.cost),
          }
        : null,
    };
  }
}
