import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { GetOrdersService } from 'src/app/services/orders/GetOrdersService';
import { GetOrderDetailService } from 'src/app/services/orders/GetOrderDetailService';

const ORDER_DETAIL_EXAMPLE = {
  id: 2000019813708728,
  packId: 2000016292307607,
  status: 'paid',
  statusDetail: null,
  dateCreated: '2026-11-27T07:47:19.000-04:00',
  dateClosed: '2026-11-27T07:47:21.000-04:00',
  lastUpdated: '2026-11-27T08:10:02.000-04:00',
  currencyId: 'ARS',
  totalAmount: 386749.16,
  paidAmount: 386749.16,
  tags: ['order_has_discount', 'paid'],
  items: [
    {
      itemId: 'MLA1694487515',
      title: 'Cámara De Acción 4k 30fps',
      categoryId: 'MLA392132',
      variationId: null,
      sellerSku: 'B0FPQ5PRP9',
      quantity: 1,
      unitPrice: 386749.16,
      grossPrice: 453999,
      saleFee: 59946.12,
      listingTypeId: 'gold_special',
    },
  ],
  payments: [
    {
      id: 191908649684,
      status: 'approved',
      statusDetail: 'accredited',
      paymentMethodId: 'account_money',
      paymentType: 'account_money',
      installments: 1,
      installmentAmount: null,
      transactionAmount: 386749.16,
      transactionAmountRefunded: 0,
      taxesAmount: 0,
      shippingCost: 0,
      couponAmount: 0,
      totalPaidAmount: 386749.16,
      marketplaceFee: 0,
      dateApproved: '2026-11-27T07:47:21.000-04:00',
    },
  ],
  discounts: [
    {
      type: 'discount',
      fundingMode: 'seller',
      offerId: 'OFFER-MLA1694487515-11853971607',
      itemId: 'MLA1694487515',
      quantity: 1,
      amounts: { total: 67249.84, seller: 67249.84, meli: null },
    },
  ],
  buyer: {
    id: 123456789,
    nickname: 'COMPRADOR123',
    billing: {
      firstName: 'Juan',
      lastName: 'Pérez',
      identificationType: 'CUIT',
      identificationNumber: '20123456789',
      taxpayerType: { id: '01', description: 'IVA Responsable Inscripto' },
      customerType: 'BU',
      address: {
        streetName: 'Av. Corrientes',
        streetNumber: '1234',
        cityName: 'Capital Federal',
        stateCode: 'AR-C',
        stateName: 'Capital Federal',
        zipCode: '1043',
        countryId: 'AR',
      },
    },
  },
  shipping: {
    id: 48648448328,
    status: 'pending',
    substatus: 'manufacturing',
    mode: 'me2',
    logisticType: 'xd_drop_off',
    trackingNumber: null,
    trackingMethod: 'MEL Distribution',
    declaredValue: 386749.16,
    dateCreated: '2026-11-27T07:47:19.601-04:00',
    costs: { grossAmount: 36000, buyerCost: 0, sellerCost: 8290 },
  },
};

@ApiTags('MercadoLibre - Orders')
@Controller('meli')
export class MeliOrdersController {
  constructor(
    private readonly service: GetOrdersService,
    private readonly detailService: GetOrderDetailService,
  ) {}

  @Get('orders/:orderId')
  @ApiOperation({
    summary: 'Detalle completo de una venta',
    description: `
Junta en una sola respuesta todo lo que Mercado Libre informa de una venta:
productos (con precio de lista, precio cobrado y comisión), pagos (medio, cuotas,
cupón), descuentos (y quién los financia), datos de facturación del comprador
(documento, condición frente al IVA, domicilio fiscal) y envío (estado, logística
y costo para comprador y vendedor).

Hace hasta cinco consultas a Mercado Libre: /orders/{id}, /orders/{id}/billing_info,
/orders/{id}/discounts, /shipments/{id} y /shipments/{id}/costs.

📌 **Notas**
- El id es el número de **venta**. Para un carrito usar \`GET /meli/packs/:packId\`.
- Si Mercado Libre no devuelve facturación, descuentos o envío, ese bloque viene \`null\` o vacío; la venta se devuelve igual.
- Incluye datos personales del comprador.
    `,
  })
  @ApiParam({ name: 'orderId', example: '2000019813708728' })
  @ApiOkResponse({
    description: 'Detalle de la venta',
    schema: { example: ORDER_DETAIL_EXAMPLE },
  })
  @ApiBadRequestResponse({ description: 'OrderId must be numeric' })
  @ApiNotFoundResponse({ description: 'Order with id … not found' })
  getOrderDetail(@Param('orderId') orderId: string) {
    return this.detailService.getOrderDetail(orderId);
  }

  @Get('packs/:packId')
  @ApiOperation({
    summary: 'Detalle de un carrito (pack) con todas sus ventas',
    description: `
Un carrito agrupa varias ventas que el comprador pagó juntas y que viajan en un
mismo envío. Devuelve el carrito y el detalle completo de cada venta, con la
misma forma que \`GET /meli/orders/:orderId\`.
    `,
  })
  @ApiParam({ name: 'packId', example: '2000016292307607' })
  @ApiOkResponse({
    description: 'Carrito con el detalle de cada venta',
    schema: {
      example: {
        id: 2000016292307607,
        status: 'released',
        shippingId: 48648448328,
        dateCreated: '2026-11-27T07:47:08.000-0400',
        orders: [ORDER_DETAIL_EXAMPLE],
      },
    },
  })
  @ApiBadRequestResponse({ description: 'PackId must be numeric' })
  @ApiNotFoundResponse({ description: 'Pack with id … not found' })
  getPackDetail(@Param('packId') packId: string) {
    return this.detailService.getPackDetail(packId);
  }

  @Get('products/:itemId/orders')
  @ApiOperation({
    summary: 'Obtiene órdenes de un producto',
    description: `
Devuelve órdenes de MercadoLibre para el seller autenticado filtrando por item ID.

Internamente usa **/orders/search** con el filtro **q**, que MercadoLibre permite usar para buscar por id de orden, id de item, título del item o nickname de la contraparte.

📌 **Notas**
- Por defecto consulta órdenes con estado **paid**
- Usa paginado real mediante **limit** y **offset**
- Las órdenes pertenecen al seller autenticado
    `,
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    example: 'MLA1757293798',
    description: 'ID del item/publicación de Mercado Libre',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Estado de la orden',
    example: 'paid',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad máxima de órdenes por página',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset para paginado',
    example: 0,
  })
  @ApiOkResponse({
    description: 'Página de órdenes del producto',
    schema: {
      example: {
        results: [
          {
            id: 2032217210,
            status: 'paid',
            dateCreated: '2019-05-22T03:51:05.000-04:00',
            dateClosed: '2019-05-22T03:51:07.000-04:00',
            totalAmount: 129.95,
            currencyId: 'ARS',
            items: [
              {
                itemId: 'MLA1757293798',
                title: 'Freidora De Aire Cosori Pro Iii Dual Blaze 6.8l Color',
                quantity: 1,
                unitPrice: 943999,
              },
            ],
          },
        ],
        paging: {
          total: 1,
          offset: 0,
          limit: 50,
        },
      },
    },
  })
  getOrdersByProduct(
    @Param('itemId') itemId: string,
    @Query('status') status = 'paid',
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.service.getOrdersByProduct({
      itemId,
      status,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Obtiene órdenes del seller con paginado',
    description: `
Devuelve órdenes de MercadoLibre utilizando el endpoint **/orders/search**.

📌 **Notas**
- Usa paginado real mediante **limit** y **offset**
- Por defecto se consultan órdenes con estado **paid**
- El paginado se basa en el campo **paging** de MercadoLibre
- Las órdenes pertenecen al seller autenticado
    `,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Estado de la orden',
    example: 'paid',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad máxima de órdenes por página',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset para paginado',
    example: 0,
  })
  @ApiOkResponse({
    description: 'Página de órdenes',
    schema: {
      example: {
        results: [
          {
            id: 2032217210,
            status: 'paid',
            dateCreated: '2019-05-22T03:51:05.000-04:00',
            dateClosed: '2019-05-22T03:51:07.000-04:00',
            totalAmount: 129.95,
            currencyId: 'BRL',
            items: [
              {
                itemId: 'MLB1054990648',
                title: 'Kit Com 03 Adesivo Spray 3m',
                quantity: 1,
                unitPrice: 129.95,
              },
            ],
          },
        ],
        paging: {
          total: 1200,
          offset: 0,
          limit: 50,
        },
      },
    },
  })
  getOrders(
    @Query('status') status = 'paid',
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.service.getOrders({
      status,
      limit: Number(limit),
      offset: Number(offset),
    });
  }
}
