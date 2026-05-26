import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GetOrdersService } from 'src/app/services/orders/GetOrdersService';

@ApiTags('MercadoLibre - Orders')
@Controller('meli')
export class MeliOrdersController {
  constructor(private readonly service: GetOrdersService) {}

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
