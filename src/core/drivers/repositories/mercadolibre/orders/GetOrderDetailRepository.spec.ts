import { MeliRateLimitException } from 'src/core/drivers/repositories/mercadolibre/http/error/meliHttpError';
import { GetOrderDetailRepository } from './GetOrderDetailRepository';

// Shapes copied from real Mercado Libre responses (personal data replaced).
const order = {
  id: 2000019813708728,
  pack_id: 2000016292307607,
  status: 'paid',
  status_detail: null,
  date_created: '2026-11-27T07:47:19.000-04:00',
  date_closed: '2026-11-27T07:47:21.000-04:00',
  last_updated: '2026-11-27T08:10:02.000-04:00',
  currency_id: 'ARS',
  total_amount: 386749.16,
  paid_amount: 386749.16,
  tags: ['order_has_discount', 'paid'],
  seller: { id: 1757836744 },
  buyer: { id: 111, nickname: 'NICK', billing_info: { id: 'x' } },
  shipping: { id: 48648448328 },
  order_items: [
    {
      item: {
        id: 'MLA1694487515',
        title: 'Cámara',
        category_id: 'MLA392132',
        variation_id: null,
        seller_sku: 'B0FPQ5PRP9',
      },
      quantity: 1,
      unit_price: 386749.16,
      gross_price: 453999,
      sale_fee: 59946.12,
      listing_type_id: 'gold_special',
    },
  ],
  payments: [
    {
      id: 191908649684,
      status: 'approved',
      status_detail: 'accredited',
      payment_method_id: 'account_money',
      payment_type: 'account_money',
      installments: 1,
      installment_amount: null,
      transaction_amount: 386749.16,
      transaction_amount_refunded: 0,
      taxes_amount: 0,
      shipping_cost: 0,
      coupon_amount: 0,
      total_paid_amount: 386749.16,
      marketplace_fee: 0,
      date_approved: '2026-11-27T07:47:21.000-04:00',
    },
  ],
};

const billing = {
  site_id: 'MLA',
  buyer: {
    cust_id: '1',
    billing_info: {
      name: 'Juan',
      last_name: 'Pérez',
      identification: { type: 'CUIT', number: '20123456789' },
      taxes: {
        taxpayer_type: { id: '01', description: 'IVA Responsable Inscripto' },
      },
      address: {
        street_name: 'Corrientes',
        street_number: '1234',
        city_name: 'CABA',
        state: { code: 'AR-C', name: 'Capital Federal' },
        zip_code: '1043',
        country_id: 'AR',
      },
      attributes: { cust_type: 'BU' },
    },
  },
};

const discounts = {
  details: [
    {
      type: 'discount',
      items: [
        {
          id: 'MLA1694487515',
          quantity: 1,
          amounts: { seller: 67249.84, total: 67249.84 },
        },
      ],
      supplier: { funding_mode: 'seller', offer_id: 'OFFER-1' },
    },
  ],
};

const shipment = {
  id: 48648448328,
  status: 'pending',
  substatus: 'manufacturing',
  logistic: { mode: 'me2', type: 'xd_drop_off', direction: 'forward' },
  tracking_number: null,
  tracking_method: 'MEL Distribution',
  declared_value: 386749.16,
  date_created: '2026-11-27T07:47:19.601-04:00',
};

const costs = {
  gross_amount: 36000,
  receiver: { cost: 0 },
  senders: [
    { user_id: 999, cost: 1 },
    { user_id: 1757836744, cost: 8290 },
  ],
};

const routes = (overrides: Record<string, unknown> = {}) => {
  const table: Record<string, unknown> = {
    '/orders/2000019813708728': order,
    '/orders/2000019813708728/billing_info': billing,
    '/orders/2000019813708728/discounts': discounts,
    '/shipments/48648448328': shipment,
    '/shipments/48648448328/costs': costs,
    '/packs/2000016292307607': {
      id: 2000016292307607,
      status: 'released',
      shipment: { id: 48648448328 },
      date_created: '2026-11-27T07:47:08.000-0400',
      orders: [{ id: 2000019813708728 }],
    },
    ...overrides,
  };
  return {
    get: jest.fn((path: string) => {
      const value = table[path];
      return value instanceof Error
        ? Promise.reject(value)
        : Promise.resolve(value ?? null);
    }),
  };
};

describe('GetOrderDetailRepository', () => {
  it('joins order, billing, discounts and shipment into one detail', async () => {
    const http = routes();
    const detail = await new GetOrderDetailRepository(
      http as never,
    ).getOrderDetail('2000019813708728');

    expect(detail).toMatchObject({
      id: 2000019813708728,
      packId: 2000016292307607,
      totalAmount: 386749.16,
      items: [
        {
          itemId: 'MLA1694487515',
          unitPrice: 386749.16,
          grossPrice: 453999,
          saleFee: 59946.12,
          sellerSku: 'B0FPQ5PRP9',
        },
      ],
      payments: [{ id: 191908649684, installments: 1, couponAmount: 0 }],
      discounts: [
        {
          fundingMode: 'seller',
          itemId: 'MLA1694487515',
          amounts: { total: 67249.84, seller: 67249.84, meli: null },
        },
      ],
      buyer: {
        id: 111,
        billing: {
          identificationType: 'CUIT',
          identificationNumber: '20123456789',
          taxpayerType: { id: '01', description: 'IVA Responsable Inscripto' },
          customerType: 'BU',
          address: { zipCode: '1043', stateCode: 'AR-C' },
        },
      },
      shipping: {
        id: 48648448328,
        logisticType: 'xd_drop_off',
        // The seller's cost, not the first sender's.
        costs: { grossAmount: 36000, buyerCost: 0, sellerCost: 8290 },
      },
    });
  });

  it('asks billing in its v2 format', async () => {
    const http = routes();
    await new GetOrderDetailRepository(http as never).getOrderDetail(
      '2000019813708728',
    );

    expect(http.get).toHaveBeenCalledWith(
      '/orders/2000019813708728/billing_info',
      { headers: { 'x-version': '2' } },
    );
  });

  it('returns null when Mercado Libre does not have the order', async () => {
    const http = routes({ '/orders/2000019813708728': null });
    expect(
      await new GetOrderDetailRepository(http as never).getOrderDetail(
        '2000019813708728',
      ),
    ).toBeNull();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('still returns the order when the optional blocks are missing', async () => {
    const http = routes({
      '/orders/2000019813708728/billing_info': null,
      '/orders/2000019813708728/discounts': null,
      '/shipments/48648448328': null,
      '/shipments/48648448328/costs': null,
    });
    const detail = await new GetOrderDetailRepository(
      http as never,
    ).getOrderDetail('2000019813708728');

    expect(detail?.buyer.billing).toBeNull();
    expect(detail?.discounts).toEqual([]);
    expect(detail?.shipping).toMatchObject({
      id: 48648448328,
      status: null,
      costs: null,
    });
  });

  it('does not ask for a shipment the order does not have', async () => {
    const http = routes({
      '/orders/2000019813708728': { ...order, shipping: { id: null } },
    });
    const detail = await new GetOrderDetailRepository(
      http as never,
    ).getOrderDetail('2000019813708728');

    expect(detail?.shipping).toBeNull();
    expect(http.get).toHaveBeenCalledTimes(3);
  });

  it('propagates a rate limit instead of returning a partial detail', async () => {
    const http = routes({
      '/orders/2000019813708728/discounts': new MeliRateLimitException(
        60,
        '/orders/2000019813708728/discounts',
      ),
    });

    await expect(
      new GetOrderDetailRepository(http as never).getOrderDetail(
        '2000019813708728',
      ),
    ).rejects.toBeInstanceOf(MeliRateLimitException);
  });

  it('returns a pack with the detail of each of its orders', async () => {
    const http = routes();
    const pack = await new GetOrderDetailRepository(
      http as never,
    ).getPackDetail('2000016292307607');

    expect(pack).toMatchObject({
      id: 2000016292307607,
      status: 'released',
      shippingId: 48648448328,
      orders: [{ id: 2000019813708728 }],
    });
  });

  it('returns null for an unknown pack', async () => {
    const http = routes();
    expect(
      await new GetOrderDetailRepository(http as never).getPackDetail('1'),
    ).toBeNull();
  });
});
